// T6.1: tabelas, chaves e índices. T6.3: migrações versionadas e dados fictícios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { abrirBanco } from '../src/banco/conexao.mjs';
import { listarMigracoes, migrar } from '../src/banco/migrar.mjs';
import { PESSOAS, conclusoesFicticias, semear } from '../src/banco/semear.mjs';
import { trilhasDoTexto } from '../src/catalogo.mjs';
import { CATALOGO_DE_TESTE } from './apoio.mjs';

const novo = () => {
  const banco = abrirBanco(':memory:');
  migrar(banco);
  return banco;
};
const todas = (banco, sql, ...p) => banco.prepare(sql).all(...p).map((l) => ({ ...l }));

test('T6.1: tabelas trilhas, itens e conclusoes com chave primária', () => {
  const banco = novo();
  const tabelas = todas(banco, "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name").map((l) => l.name);
  assert.deepEqual(tabelas, ['conclusoes', 'itens', 'schema_migracoes', 'trilhas']);
  const chave = (tabela) => todas(banco, `PRAGMA table_info(${tabela})`).filter((c) => c.pk).map((c) => c.name);
  assert.deepEqual(chave('trilhas'), ['codigo']);
  assert.deepEqual(chave('itens'), ['codigo']);
  assert.deepEqual(chave('conclusoes'), ['id']);
});

test('T6.1: chaves estrangeiras de itens → trilhas e de conclusoes → itens', () => {
  const banco = novo();
  const fk = (tabela) => todas(banco, `PRAGMA foreign_key_list(${tabela})`).map((f) => `${f.from} → ${f.table}.${f.to}`);
  assert.deepEqual(fk('itens'), ['trilha → trilhas.codigo']);
  assert.deepEqual(fk('conclusoes'), ['item → itens.codigo']);
  assert.equal(banco.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
});

test('T6.1: índices para conclusões por item e por pessoa, e itens por trilha', () => {
  const banco = novo();
  const indices = (tabela) =>
    todas(banco, `PRAGMA index_list(${tabela})`).map((i) => ({
      unico: i.unique === 1,
      colunas: todas(banco, `PRAGMA index_info(${i.name})`).map((c) => c.name),
    }));
  assert.deepEqual(indices('conclusoes').map((i) => [i.unico, i.colunas.join(',')]).sort(), [
    [false, 'usuario'],
    [true, 'item,usuario'],
  ]);
  assert.deepEqual(
    indices('itens')
      .map((i) => i.colunas.join(','))
      .sort(),
    ['codigo', 'trilha,posicao'],
  );
  // O plano usa os índices: nada de varrer a tabela inteira.
  const plano = (sql) => todas(banco, `EXPLAIN QUERY PLAN ${sql}`, 'x').map((l) => l.detail).join(' | ');
  assert.match(plano('SELECT * FROM conclusoes WHERE item = ?'), /USING INDEX sqlite_autoindex_conclusoes_1/);
  assert.match(plano('SELECT * FROM conclusoes WHERE usuario = ?'), /USING INDEX idx_conclusoes_usuario/);
});

test('T6.3: migrações em ordem, registradas na tabela de controle', () => {
  const banco = abrirBanco(':memory:');
  const aplicadas = migrar(banco, { relogio: () => new Date('2026-11-10T12:00:00Z') });
  const versoes = listarMigracoes().map((m) => m.versao);
  assert.deepEqual(aplicadas, versoes);
  assert.deepEqual(
    todas(banco, 'SELECT versao, aplicada_em FROM schema_migracoes ORDER BY versao'),
    versoes.map((versao) => ({ versao, aplicada_em: '2026-11-10T12:00:00.000Z' })),
  );
});

test('T6.3: rodar as migrações duas vezes não muda nada na segunda', () => {
  const banco = abrirBanco(':memory:');
  migrar(banco);
  const antes = todas(banco, 'SELECT type, name, sql FROM sqlite_schema ORDER BY name');
  assert.deepEqual(migrar(banco), []);
  assert.deepEqual(todas(banco, 'SELECT type, name, sql FROM sqlite_schema ORDER BY name'), antes);
});

test('T6.3: migração que falha é desfeita inteira e não fica registrada', (t) => {
  const pasta = mkdtempSync(join(tmpdir(), 'migracoes-'));
  t.after(() => rmSync(pasta, { recursive: true }));
  writeFileSync(join(pasta, '001_boa.sql'), 'CREATE TABLE a (x INTEGER);');
  writeFileSync(join(pasta, '002_ruim.sql'), 'CREATE TABLE b (y INTEGER); INSERT INTO tabela_que_nao_existe VALUES (1);');
  const banco = abrirBanco(':memory:');
  assert.throws(() => migrar(banco, { pasta: pathToFileURL(`${pasta}/`) }), /002_ruim.sql falhou/);
  assert.deepEqual(todas(banco, 'SELECT versao FROM schema_migracoes'), [{ versao: 1 }]);
  assert.equal(banco.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name = 'b'").get().n, 0);
});

test('T6.3: nome fora do padrão ou versão faltando é recusado', (t) => {
  const pasta = mkdtempSync(join(tmpdir(), 'migracoes-'));
  t.after(() => rmSync(pasta, { recursive: true }));
  writeFileSync(join(pasta, '001_a.sql'), '');
  writeFileSync(join(pasta, '003_c.sql'), '');
  assert.throws(() => listarMigracoes(pathToFileURL(`${pasta}/`)), /versão 002 faltando/);
  writeFileSync(join(pasta, 'sem-numero.sql'), '');
  assert.throws(() => listarMigracoes(pathToFileURL(`${pasta}/`)), /fora do padrão/);
});

test('T6.3: dados de teste só com pessoas e links fictícios', () => {
  const banco = abrirBanco(':memory:');
  const n = semear(banco);
  assert.ok(n.trilhas >= 12 && n.itens >= 161 && n.conclusoes > 100, JSON.stringify(n));
  for (const c of todas(banco, 'SELECT usuario, pr FROM conclusoes')) {
    assert.match(c.usuario, /^pessoa-ficticia-\d{2}$/);
    assert.match(c.pr, /^https:\/\/github\.com\/exemplo\/painel-de-formacao\/pull\/\d+$/);
  }
  assert.equal(PESSOAS.length, 12);
});

test('T6.3: os dados de teste são sempre os mesmos e semear de novo não duplica', () => {
  const trilhas = trilhasDoTexto(CATALOGO_DE_TESTE);
  assert.deepEqual(conclusoesFicticias(trilhas), conclusoesFicticias(trilhas));
  const banco = abrirBanco(':memory:');
  const primeira = semear(banco);
  assert.deepEqual(semear(banco), primeira);
});

test('as chaves estrangeiras estão ligadas: conclusão de item que não existe é recusada', () => {
  const banco = novo();
  assert.throws(
    () => banco.prepare("INSERT INTO conclusoes (item, usuario, pr, concluida_em) VALUES ('T9.9', 'a', 'b', 'c')").run(),
    /FOREIGN KEY constraint failed/,
  );
});
