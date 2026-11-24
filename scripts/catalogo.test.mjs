import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { atualizarTexto, lerCatalogo, progresso, linhaProgresso } from './catalogo.mjs';

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
