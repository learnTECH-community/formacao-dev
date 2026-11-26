import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atualizarTexto, comArquivo, lerCatalogo, progresso, linhaProgresso, SAIDA } from './catalogo.mjs';

const exemplo = `## T1 · Git
- [x] **T1.1** fluxo
- [ ] **T1.2** issue
## T2 · Frontend
- [ ] **T2.1** html`;

test('lê trilhas e itens e calcula o progresso', () => {
  const { trilhas, erros } = lerCatalogo(exemplo);
  assert.deepEqual(erros, []);
  assert.equal(trilhas.length, 2);
  assert.deepEqual(progresso(trilhas), { feitos: 1, total: 3 });
  assert.equal(linhaProgresso(progresso(trilhas)), '**Progresso:** 1 de 3 itens');
});

test('acusa código repetido, item na trilha errada e formato inválido', () => {
  const { erros } = lerCatalogo(`## T1 · Git
- [ ] **T1.1** a
- [ ] **T1.1** b
- [ ] **T2.1** c
- [] T1.3 sem formato`);
  assert.equal(erros.length, 3);
});

test('o CATALOGO.md real está válido e a linha de progresso bate', () => {
  const texto = readFileSync(new URL('../CATALOGO.md', import.meta.url), 'utf8');
  const { trilhas, erros } = lerCatalogo(texto);
  assert.deepEqual(erros, []);
  assert.ok(texto.includes(linhaProgresso(progresso(trilhas))));
});

test('--atualizar falha fechado: sem a linha Progresso ou com item fora do formato, não grava', () => {
  const bom = '**Progresso:** 0 de 0 itens\n\n## T1 · Git\n- [x] **T1.1** Um.\n- [ ] **T1.2** Dois.\n';
  const r = atualizarTexto(bom);
  assert.deepEqual(r.erros, []);
  assert.match(r.novo, /^\*\*Progresso:\*\* 1 de 2 itens$/m);
  const semLinha = atualizarTexto('## T1 · Git\n- [x] **T1.1** Um.\n');
  assert.equal(semLinha.novo, null);
  assert.match(semLinha.erros.join(), /não tem a linha "\*\*Progresso:\*\* \.\.\."/);
  const comErro = atualizarTexto('**Progresso:** 0 de 0 itens\n\n## T1 · Git\n- [X] **T1.1** maiúsculo.\n');
  assert.equal(comErro.novo, null, 'item fora do formato: não grava');
  assert.match(comErro.erros.join(), /fora do formato/);
});

// R19 QA do #362: o script de verdade, com os códigos de saída e o arquivo intacto na falha.
const SCRIPT = fileURLToPath(new URL('./catalogo.mjs', import.meta.url));
const pasta = mkdtempSync(join(tmpdir(), 'catalogo-'));
function rodar(nome, texto, ...args) {
  const caminho = join(pasta, nome);
  if (texto !== null) writeFileSync(caminho, texto);
  const r = spawnSync(process.execPath, [SCRIPT, '--arquivo', caminho, ...args], { encoding: 'utf8' });
  return { ...r, depois: texto === null ? null : readFileSync(caminho, 'utf8') };
}
const certo = '**Progresso:** 1 de 2 itens\n\n## T1 · Git\n- [x] **T1.1** Um.\n- [ ] **T1.2** Dois.\n';

test('script: 0 em dia, 2 desatualizado, 0 depois do --atualizar', () => {
  assert.equal(rodar('a.md', certo).status, SAIDA.ok);
  const velho = certo.replace('1 de 2', '0 de 2');
  const r = rodar('b.md', velho);
  assert.equal(r.status, SAIDA.desatualizado);
  assert.match(r.stderr, /b\.md: a linha "Progresso" não bate; rode/);
  const at = rodar('c.md', velho, '--atualizar');
  assert.equal(at.status, SAIDA.ok);
  assert.match(at.depois, /^\*\*Progresso:\*\* 1 de 2 itens$/m);
});

test('script: 1 inválido, com arquivo e linha, e o arquivo fica igual (falha fechada)', () => {
  for (const [nome, texto, motivo] of [
    ['indentado.md', certo + '  - [ ] **T1.3** indentado\n', /indentado\.md:6: item fora do formato/],
    ['estrela.md', certo + '* [ ] **T1.3** com estrela\n', /estrela\.md:6: item fora do formato/],
    ['sem-progresso.md', certo.replace(/^\*\*Progresso.*\n/, ''), /sem-progresso\.md: o arquivo não tem a linha .*acrescente-a/],
    ['dois-progressos.md', certo + '**Progresso:** 9 de 9 itens\n', /aparece 2 vezes/],
    ['vazio.md', '**Progresso:** 0 de 0 itens\n', /nenhuma trilha ou nenhum item/],
  ]) {
    for (const args of [[], ['--atualizar']]) {
      const r = rodar(nome, texto, ...args);
      assert.equal(r.status, SAIDA.invalido, `${nome} ${args}`);
      assert.match(r.stderr, motivo, nome);
      assert.equal(r.depois, texto, `${nome}: o arquivo não mudou`);
    }
  }
});

test('script: 3 quando não dá para ler o arquivo', () => {
  const r = rodar('nao-existe.md', null);
  assert.equal(r.status, SAIDA.leitura);
  assert.match(r.stderr, /nao-existe\.md: não deu para ler o arquivo \(ENOENT\)/);
});

test('comArquivo: põe "arquivo:linha:" nos erros com linha e "arquivo:" nos outros', () => {
  assert.deepEqual(comArquivo('C.md', ['linha 4: fora do formato', 'sem itens']), ['C.md:4: fora do formato', 'C.md: sem itens']);
});
