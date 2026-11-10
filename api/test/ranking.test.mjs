// T6.9: ranking e progresso semanal com CTE e funções de janela.
import { describe, test } from 'node:test';
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

const c = (item, usuario, data) => ({ item, usuario, pr: 'https://github.com/exemplo/repo/pull/1', concluidaEm: `${data}T12:00:00.000Z` });

// Várias semanas: 26/10 (segunda) a 10/11. pessoa-a e pessoa-b empatam com 2; pessoa-c tem 3; pessoa-d tem 1.
const CONCLUSOES = [
  c('T1.1', 'pessoa-c', '2026-10-26'),
  c('T1.2', 'pessoa-c', '2026-11-01'), // domingo: ainda é a semana de 26/10
  c('T2.1', 'pessoa-c', '2026-11-02'),
  c('T1.1', 'pessoa-a', '2026-11-03'),
  c('T1.2', 'pessoa-a', '2026-11-09'),
  c('T1.1', 'pessoa-b', '2026-11-04'),
  c('T2.2', 'pessoa-b', '2026-11-10'),
  c('T2.2', 'pessoa-d', '2026-11-10'),
];

const RANKING = [
  { posicao: 1, usuario: 'pessoa-c', concluidos: 3, empatado: false },
  { posicao: 2, usuario: 'pessoa-a', concluidos: 2, empatado: true },
  { posicao: 2, usuario: 'pessoa-b', concluidos: 2, empatado: true },
  { posicao: 4, usuario: 'pessoa-d', concluidos: 1, empatado: false },
];

const SEMANAS = [
  { semana: '2026-10-26', concluidas: 2, acumulado: 2 },
  { semana: '2026-11-02', concluidas: 3, acumulado: 5 },
  { semana: '2026-11-09', concluidas: 3, acumulado: 8 },
];

function sqlite() {
  const banco = abrirBanco(':memory:');
  migrar(banco);
  return criarRepositorioSqlite(banco);
}

for (const [nome, criar, pular = false] of [
  ['memória', () => criarRepositorioEmMemoria()],
  ['SQLite', sqlite],
  ['MongoDB', repositorioMongoDeTeste, SEM_MONGO],
]) {
  describe(`ranking e semanas: ${nome}`, { skip: pular }, () => {
    const preparar = async () => {
      const r = await criar();
      await r.gravarCatalogo(trilhasDoTexto(CATALOGO_DE_TESTE));
      for (const x of CONCLUSOES) await r.registrarConclusao(x);
      return r;
    };

    test('empate divide a posição e pula a seguinte (1, 2, 2, 4), e diz que está empatado', async () => {
      assert.deepEqual(await (await preparar()).ranking(), RANKING);
    });

    test('conclusões por semana (segunda a domingo, UTC) e o acumulado', async () => {
      assert.deepEqual(await (await preparar()).progressoSemanal(), SEMANAS);
    });

    test('sem conclusões, listas vazias', async () => {
      const r = await criar();
      assert.deepEqual(await r.ranking(), []);
      assert.deepEqual(await r.progressoSemanal(), []);
    });
  });
}

test('as consultas usam WITH e OVER (...)', () => {
  for (const nome of ['ranking', 'progresso_semanal']) {
    assert.match(consulta(nome), /^WITH /m, nome);
    assert.match(consulta(nome), /OVER \(/, nome);
  }
});

test('com os dados fictícios de 6 semanas, o acumulado fecha no total de conclusões', () => {
  const banco = abrirBanco(':memory:');
  const { conclusoes } = semear(banco);
  const semanas = banco.prepare(consulta('progresso_semanal')).all();
  assert.equal(semanas.length, 6);
  assert.equal(semanas.at(-1).acumulado, conclusoes);
  const ranking = banco.prepare(consulta('ranking')).all();
  assert.equal(ranking.length, 12);
  assert.equal(ranking[0].posicao, 1);
});

test('rotas GET /v1/ranking e /v1/progresso/semanas', async (t) => {
  const repositorio = sqlite();
  const api = await subir({ repositorio });
  t.after(api.fechar);
  await fetch(`${api.base}/v1/catalogo`);
  for (const x of CONCLUSOES) await repositorio.registrarConclusao(x);
  assert.deepEqual(await (await fetch(`${api.base}/v1/ranking`)).json(), { ranking: RANKING });
  assert.deepEqual(await (await fetch(`${api.base}/v1/progresso/semanas`)).json(), { semanas: SEMANAS });
});
