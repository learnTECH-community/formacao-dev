// T6.12: o repositório MongoDB segue a interface e é escolhido por variável.
// T6.13: o progresso por trilha pelo pipeline de agregação dá o mesmo resultado da
// view SQL (T6.10) com os mesmos dados, e o pipeline usa os índices.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { abrirBanco } from '../src/banco/conexao.mjs';
import { conclusoesFicticias, semear } from '../src/banco/semear.mjs';
import { trilhasDoTexto } from '../src/catalogo.mjs';
import { conferirRepositorio } from '../src/repositorios/contrato.mjs';
import { PIPELINE_DO_PROGRESSO, criarRepositorioMongo } from '../src/repositorios/mongo.mjs';
import { criarRepositorioSqlite } from '../src/repositorios/sqlite.mjs';
import { SEM_MONGO, bancoMongoDeTeste } from './mongo.mjs';

const TEXTO = readFileSync(new URL('../../CATALOGO.md', import.meta.url), 'utf8');

test('o pipeline do progresso usa $match, $group e $project', () => {
  const estagios = JSON.stringify(PIPELINE_DO_PROGRESSO);
  for (const estagio of ['$match', '$group', '$project']) assert.ok(estagios.includes(`"${estagio}"`), estagio);
});

test('o servidor escolhe o banco pela variável REPOSITORIO (sqlite, memoria ou mongo)', () => {
  const servidor = readFileSync(new URL('../src/servidor.mjs', import.meta.url), 'utf8');
  assert.match(servidor, /process\.env\.REPOSITORIO/);
  assert.match(servidor, /tipo === 'mongo'/);
  assert.match(readFileSync(new URL('../.env.example', import.meta.url), 'utf8'), /^MONGO_URL=$/m);
});

describe('MongoDB contra o SQLite, com os mesmos dados', { skip: SEM_MONGO }, () => {
  async function preparar() {
    const sqlite = abrirBanco(':memory:');
    semear(sqlite);
    const db = await bancoMongoDeTeste();
    const mongo = await criarRepositorioMongo(db);
    const trilhas = trilhasDoTexto(TEXTO);
    await mongo.gravarCatalogo(trilhas);
    for (const c of conclusoesFicticias(trilhas)) await mongo.registrarConclusao(c);
    return { db, mongo, sql: criarRepositorioSqlite(sqlite) };
  }

  test('o repositório MongoDB tem todas as funções da interface', async () => {
    conferirRepositorio(await criarRepositorioMongo(await bancoMongoDeTeste()));
  });

  test('T6.13: progresso por trilha igual ao da view v_progresso_trilha', async () => {
    const { mongo, sql } = await preparar();
    const daAgregacao = await mongo.progressoPorTrilha();
    assert.equal(daAgregacao.length, 12);
    assert.deepEqual(daAgregacao, await sql.progressoPorTrilha());
  });

  test('as outras consultas também batem: pessoas, concluintes, ranking e semanas', async () => {
    const { mongo, sql } = await preparar();
    assert.deepEqual(await mongo.progressoPorPessoa(), await sql.progressoPorPessoa());
    assert.deepEqual(await mongo.ranking(), await sql.ranking());
    assert.deepEqual(await mongo.progressoSemanal(), await sql.progressoSemanal());
    for (const t of ['T0', 'T1', 'T4', 'T11']) assert.deepEqual(await mongo.concluintesDaTrilha(t), await sql.concluintesDaTrilha(t), t);
  });

  test('T6.13: o explain mostra os índices em uso no pipeline', async () => {
    const { db } = await preparar();
    const plano = JSON.stringify(await db.collection('trilhas').aggregate(PIPELINE_DO_PROGRESSO).explain('executionStats'));
    // O $lookup das conclusões procura pelo índice único { item, usuario }.
    assert.match(plano, /item_1_usuario_1/);
    // O $lookup dos itens usa o índice { trilha, posicao }.
    assert.match(plano, /trilha_1_posicao_1/);
  });

  test('T6.12: o índice único recusa a mesma conclusão, e a repetida devolve a que existia', async () => {
    const mongo = await criarRepositorioMongo(await bancoMongoDeTeste());
    await mongo.gravarCatalogo(trilhasDoTexto(TEXTO));
    const c = { item: 'T5.1', usuario: 'pessoa-a', pr: 'https://github.com/exemplo/repo/pull/1', concluidaEm: '2026-11-10T12:00:00.000Z' };
    const resultados = await Promise.all(Array.from({ length: 10 }, () => mongo.registrarConclusao(c)));
    assert.equal(resultados.filter((r) => r.criada).length, 1);
    assert.equal(new Set(resultados.map((r) => r.conclusao.id)).size, 1);
    assert.equal((await mongo.listarConclusoes()).length, 1);
  });
});
