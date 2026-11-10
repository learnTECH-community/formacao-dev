// T6.7: um teste por restrição prova que o dado ruim é recusado pelo banco.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { abrirBanco } from '../src/banco/conexao.mjs';
import { PASTA_DAS_MIGRACOES, migrar } from '../src/banco/migrar.mjs';

function banco() {
  const b = abrirBanco(':memory:');
  migrar(b);
  b.prepare("INSERT INTO trilhas (codigo, nome, posicao) VALUES ('T1', 'Um', 1)").run();
  b.prepare("INSERT INTO itens (codigo, trilha, texto, marcado, posicao) VALUES ('T1.1', 'T1', 'Item', 0, 1)").run();
  return b;
}

const BOA = { item: 'T1.1', usuario: 'pessoa-a', pr: 'https://github.com/exemplo/repo/pull/1', concluida_em: '2026-11-10T12:00:00.000Z' };
const conclusao = (b, mudanca = {}) => {
  const c = { ...BOA, ...mudanca };
  return b.prepare('INSERT INTO conclusoes (item, usuario, pr, concluida_em) VALUES (?, ?, ?, ?)').run(c.item, c.usuario, c.pr, c.concluida_em);
};
const item = (b, codigo, trilha = 'T1', marcado = 0, texto = 'Item', posicao = 2) =>
  b.prepare('INSERT INTO itens (codigo, trilha, texto, marcado, posicao) VALUES (?, ?, ?, ?, ?)').run(codigo, trilha, texto, marcado, posicao);

test('a conclusão boa entra', () => {
  assert.equal(conclusao(banco()).changes, 1);
});

test('CHECK: código do item fora do formato Tn.m é recusado', () => {
  const b = banco();
  for (const codigo of ['T1', 'T1.', 'T1.2.3', 'X1.2', 'T1.a', 't1.2', 'T1. 2']) {
    assert.throws(() => item(b, codigo), /CHECK constraint failed/, codigo);
  }
  assert.equal(item(b, 'T1.20').changes, 1);
});

test('CHECK: o código do item começa pelo código da trilha', () => {
  const b = banco();
  b.prepare("INSERT INTO trilhas (codigo, nome, posicao) VALUES ('T10', 'Dez', 2)").run();
  assert.throws(() => item(b, 'T10.1', 'T1'), /CHECK constraint failed/);
  assert.equal(item(b, 'T10.1', 'T10').changes, 1);
});

test('CHECK: código da trilha fora do formato Tn é recusado', () => {
  const b = banco();
  assert.throws(() => b.prepare("INSERT INTO trilhas (codigo, nome, posicao) VALUES ('T2a', 'X', 2)").run(), /CHECK constraint failed/);
  assert.throws(() => b.prepare("INSERT INTO trilhas (codigo, nome, posicao) VALUES ('2', 'X', 2)").run(), /CHECK constraint failed/);
});

test('CHECK: marcado só aceita 0 ou 1, e posição precisa ser positiva', () => {
  const b = banco();
  assert.throws(() => item(b, 'T1.5', 'T1', 2), /CHECK constraint failed/);
  assert.throws(() => item(b, 'T1.6', 'T1', 0, 'Item', 0), /CHECK constraint failed/);
});

test('CHECK: texto e nome vazios são recusados', () => {
  const b = banco();
  assert.throws(() => item(b, 'T1.7', 'T1', 0, '   '), /CHECK constraint failed/);
  assert.throws(() => b.prepare("INSERT INTO trilhas (codigo, nome, posicao) VALUES ('T3', '', 3)").run(), /CHECK constraint failed/);
});

test('chave estrangeira: conclusão de item inexistente é recusada', () => {
  assert.throws(() => conclusao(banco(), { item: 'T9.9' }), /FOREIGN KEY constraint failed/);
});

test('chave estrangeira: item de trilha inexistente é recusado, e item com conclusão não é apagado', () => {
  const b = banco();
  assert.throws(() => item(b, 'T9.1', 'T9'), /FOREIGN KEY constraint failed/);
  conclusao(b);
  assert.throws(() => b.prepare("DELETE FROM itens WHERE codigo = 'T1.1'").run(), /FOREIGN KEY constraint failed/);
});

test('NOT NULL: conclusão sem usuário é recusada', () => {
  assert.throws(() => conclusao(banco(), { usuario: null }), /NOT NULL constraint failed: conclusoes.usuario/);
});

test('UNIQUE: a mesma pessoa no mesmo item é recusada', () => {
  const b = banco();
  conclusao(b);
  assert.throws(() => conclusao(b, { pr: 'https://github.com/exemplo/repo/pull/2' }), /UNIQUE constraint failed: conclusoes.item, conclusoes.usuario/);
});

test('CHECK: usuário fora das regras do GitHub é recusado', () => {
  const b = banco();
  for (const usuario of ['', 'a'.repeat(40), 'com espaço', "x'; --"]) assert.throws(() => conclusao(b, { usuario }), /CHECK constraint failed/, usuario);
});

test('CHECK: pr que não é link de PR do GitHub é recusado', () => {
  const b = banco();
  for (const pr of ['https://exemplo.com/pull/1', 'https://github.com/exemplo/repo/issues/1', 'github.com/a/b/pull/1']) {
    assert.throws(() => conclusao(b, { pr }), /CHECK constraint failed/, pr);
  }
});

test('CHECK: data fora do ISO 8601 em UTC é recusada', () => {
  const b = banco();
  for (const concluida_em of ['10/11/2026', '2026-11-10', '2026-11-10 12:00:00', '2026-13-40T12:00:00.000Z']) {
    assert.throws(() => conclusao(b, { concluida_em }), /CHECK constraint failed/, concluida_em);
  }
});

test('os dados que já existiam sobrevivem à migração 002', (t) => {
  const pasta = mkdtempSync(join(tmpdir(), 'migracoes-'));
  t.after(() => rmSync(pasta, { recursive: true }));
  cpSync(new URL('001_trilhas_itens_conclusoes.sql', PASTA_DAS_MIGRACOES), join(pasta, '001_trilhas_itens_conclusoes.sql'));
  const b = abrirBanco(':memory:');
  migrar(b, { pasta: pathToFileURL(`${pasta}/`) });
  b.exec("INSERT INTO trilhas VALUES ('T1', 'Um', 1); INSERT INTO itens VALUES ('T1.1', 'T1', 'Item', 1, 1)");
  conclusao(b);
  migrar(b);
  assert.deepEqual({ ...b.prepare('SELECT item, usuario, pr, concluida_em FROM conclusoes').get() }, BOA);
  assert.equal(b.prepare('PRAGMA foreign_key_check').all().length, 0);
});

test('migração já aplicada não pode ser editada: o migrador para e pede uma nova', (t) => {
  const pasta = mkdtempSync(join(tmpdir(), 'migracoes-'));
  t.after(() => rmSync(pasta, { recursive: true }));
  writeFileSync(join(pasta, '001_a.sql'), 'CREATE TABLE a (x INTEGER);');
  const url = pathToFileURL(`${pasta}/`);
  const b = abrirBanco(':memory:');
  migrar(b, { pasta: url });
  writeFileSync(join(pasta, '001_a.sql'), 'CREATE TABLE a (x INTEGER, y TEXT);');
  assert.throws(() => migrar(b, { pasta: url }), /001_a.sql foi editada depois de aplicada: crie uma migração nova/);
});
