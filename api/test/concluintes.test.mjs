// T6.8: quem concluiu todos os itens de uma trilha, com JOIN e com subconsulta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirBanco } from '../src/banco/conexao.mjs';
import { consulta } from '../src/banco/consultas.mjs';
import { migrar } from '../src/banco/migrar.mjs';
import { semear } from '../src/banco/semear.mjs';
import { trilhasDoTexto } from '../src/catalogo.mjs';
import { criarRepositorioEmMemoria } from '../src/repositorios/memoria.mjs';
import { criarRepositorioSqlite } from '../src/repositorios/sqlite.mjs';
import { CATALOGO_DE_TESTE, subir } from './apoio.mjs';
import { SEM_MONGO, repositorioMongoDeTeste } from './mongo.mjs';

const VERSOES = ['concluintes_da_trilha_join', 'concluintes_da_trilha_subconsulta'];
const em = (dia) => `2026-11-${String(dia).padStart(2, '0')}T12:00:00.000Z`;
const c = (item, usuario, dia) => ({ item, usuario, pr: `https://github.com/exemplo/repo/pull/${dia}`, concluidaEm: em(dia) });

// T1 tem T1.1 e T1.2. pessoa-a e pessoa-c fecham a T1; pessoa-b fica no meio.
const CONCLUSOES = [c('T1.1', 'pessoa-a', 1), c('T1.2', 'pessoa-a', 5), c('T1.1', 'pessoa-b', 2), c('T2.1', 'pessoa-b', 3), c('T1.2', 'pessoa-c', 3), c('T1.1', 'pessoa-c', 4)];
const ESPERADO = [
  { usuario: 'pessoa-c', concluiu_em: em(4) },
  { usuario: 'pessoa-a', concluiu_em: em(5) },
];

async function preparar(repositorio) {
  await repositorio.gravarCatalogo(trilhasDoTexto(CATALOGO_DE_TESTE));
  for (const x of CONCLUSOES) await repositorio.registrarConclusao(x);
  return repositorio;
}

function sqlite() {
  const banco = abrirBanco(':memory:');
  migrar(banco);
  return { banco, repositorio: criarRepositorioSqlite(banco) };
}

test('as duas versões em .sql dão o mesmo resultado com dados fictícios', async () => {
  const { banco, repositorio } = sqlite();
  await preparar(repositorio);
  for (const versao of VERSOES) {
    assert.deepEqual(banco.prepare(consulta(versao)).all({ trilha: 'T1' }).map((l) => ({ ...l })), ESPERADO, versao);
    // Ninguém fechou a T2 (dois itens; só um tem conclusão).
    assert.deepEqual(banco.prepare(consulta(versao)).all({ trilha: 'T2' }), [], versao);
  }
});

test('trilha sem itens não devolve ninguém, nas duas versões', async () => {
  const { banco, repositorio } = sqlite();
  await preparar(repositorio);
  banco.prepare("INSERT INTO trilhas (codigo, nome, posicao) VALUES ('T7', 'Vazia', 7)").run();
  for (const versao of VERSOES) assert.deepEqual(banco.prepare(consulta(versao)).all({ trilha: 'T7' }), [], versao);
});

test('as duas versões concordam com o catálogo real e os dados de teste, em toda trilha', () => {
  const banco = abrirBanco(':memory:');
  semear(banco);
  const trilhas = banco.prepare('SELECT codigo FROM trilhas').all().map((t) => t.codigo);
  let alguem = 0;
  for (const trilha of trilhas) {
    const [join, sub] = VERSOES.map((v) => banco.prepare(consulta(v)).all({ trilha }).map((l) => ({ ...l })));
    assert.deepEqual(sub, join, trilha);
    alguem += join.length;
  }
  assert.ok(alguem > 0, 'os dados de teste têm alguém que fechou uma trilha');
});

test('o repositório em memória dá o mesmo resultado', async () => {
  const r = await preparar(criarRepositorioEmMemoria());
  assert.deepEqual(await r.concluintesDaTrilha('T1'), ESPERADO);
  assert.deepEqual(await r.concluintesDaTrilha('T2'), []);
});

test('o repositório MongoDB dá o mesmo resultado (T6.12)', { skip: SEM_MONGO }, async () => {
  const r = await preparar(await repositorioMongoDeTeste());
  assert.deepEqual(await r.concluintesDaTrilha('T1'), ESPERADO);
  assert.deepEqual(await r.concluintesDaTrilha('T2'), []);
});

test('a rota GET /v1/trilhas/:codigo/concluintes usa a versão escolhida (JOIN)', async (t) => {
  const { repositorio } = sqlite();
  const api = await subir({ repositorio });
  t.after(api.fechar);
  await fetch(`${api.base}/v1/catalogo`);
  for (const x of CONCLUSOES) await repositorio.registrarConclusao(x);
  const r = await fetch(`${api.base}/v1/trilhas/T1/concluintes`);
  assert.deepEqual(await r.json(), { trilha: 'T1', concluintes: ESPERADO });
  assert.equal((await fetch(`${api.base}/v1/trilhas/T9/concluintes`)).status, 404);
});

test('o plano: a versão com JOIN não tem subconsulta correlacionada; a outra tem', () => {
  const banco = abrirBanco(':memory:');
  semear(banco);
  const plano = (v) =>
    banco
      .prepare(`EXPLAIN QUERY PLAN ${consulta(v)}`)
      .all({ trilha: 'T1' })
      .map((l) => l.detail)
      .join('\n');
  assert.doesNotMatch(plano('concluintes_da_trilha_join'), /CORRELATED/);
  assert.match(plano('concluintes_da_trilha_join'), /SEARCH i USING INDEX idx_itens_trilha \(trilha=\?\)/);
  assert.match(plano('concluintes_da_trilha_subconsulta'), /CORRELATED SCALAR SUBQUERY/);
  assert.match(consulta('concluintes_da_trilha_join'), /JOIN/);
  assert.doesNotMatch(consulta('concluintes_da_trilha_subconsulta'), /^JOIN|\nJOIN/);
});
