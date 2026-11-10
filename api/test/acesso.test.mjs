// T6.11: a conexão da API só lê e grava linhas; as migrações rodam noutra.
// Backup restaurado num banco vazio, com a contagem de linhas conferida.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { limitarAoUsoDaApi } from '../src/banco/acesso.mjs';
import { contarLinhas, fazerBackup, restaurar } from '../src/banco/backup.mjs';
import { abrirBanco } from '../src/banco/conexao.mjs';
import { migrar } from '../src/banco/migrar.mjs';
import { semear } from '../src/banco/semear.mjs';
import { criarRepositorioSqlite } from '../src/repositorios/sqlite.mjs';
import { conclusao } from './apoio.mjs';

// As pastas saem no fim do arquivo, com todas as conexões já fechadas (no Windows,
// um arquivo de banco aberto não pode ser apagado).
const pastas = [];
after(() => {
  for (const p of pastas) rmSync(p, { recursive: true, force: true });
});
function pasta() {
  const p = mkdtempSync(join(tmpdir(), 'acesso-'));
  pastas.push(p);
  return p;
}

// O autorizador chegou no Node 24.10. No 22, os testes dele ficam pulados com o motivo;
// o CI roda este arquivo também num passo com o Node 24, que não aceita nenhum pulado.
const SEM_AUTORIZADOR =
  typeof DatabaseSync.prototype.setAuthorizer === 'function' ? false : 'este Node não tem DatabaseSync.setAuthorizer (Node 24.10+); no CI, roda no passo com o Node 24';

/** Banco num arquivo: a conexão de migração semeia e fecha; a da API abre trancada. */
function prepararArquivo(t, { trancar = true } = {}) {
  const caminho = join(pasta(), 'painel.db');
  const deMigracao = abrirBanco(caminho);
  semear(deMigracao);
  deMigracao.close();
  const daApi = trancar ? limitarAoUsoDaApi(abrirBanco(caminho)) : abrirBanco(caminho);
  t.after(() => daApi.close());
  return { caminho, daApi };
}

test('a conexão da API não cria, não muda e não apaga tabela, índice nem view', { skip: SEM_AUTORIZADOR }, (t) => {
  const { daApi } = prepararArquivo(t);
  const recusadas = [
    'CREATE TABLE intrusa (x INTEGER)',
    'DROP TABLE conclusoes',
    'ALTER TABLE conclusoes ADD COLUMN extra TEXT',
    'CREATE INDEX idx_extra ON conclusoes (pr)',
    'DROP INDEX idx_conclusoes_usuario',
    'DROP VIEW v_progresso_trilha',
    'CREATE VIEW v_extra AS SELECT 1',
    'PRAGMA foreign_keys = OFF',
    "ATTACH DATABASE ':memory:' AS outro",
  ];
  for (const sql of recusadas) assert.throws(() => daApi.exec(sql), /not authorized/, sql);
  // As tabelas continuam lá.
  assert.ok(contarLinhas(daApi).conclusoes > 0);
});

test('a conexão da API lê e grava linhas normalmente (o repositório funciona)', { skip: SEM_AUTORIZADOR }, async (t) => {
  const { daApi } = prepararArquivo(t);
  const r = criarRepositorioSqlite(daApi);
  const antes = (await r.saude()).conclusoes;
  const { conclusao: c, criada } = await r.registrarConclusao(conclusao('T9.1', 'pessoa-nova', 5));
  assert.equal(criada, true);
  assert.equal((await r.atualizarConclusao(c.id, { pr: 'https://github.com/exemplo/repo/pull/6' })).pr.at(-1), '6');
  assert.equal(await r.apagarConclusao(c.id), true);
  assert.equal((await r.saude()).conclusoes, antes);
  assert.ok((await r.progressoPorTrilha()).length >= 12);
  assert.ok((await r.ranking()).length > 0);
});

test('as migrações rodam com a outra conexão, sem a trava', { skip: SEM_AUTORIZADOR }, (t) => {
  const caminho = join(pasta(), 'painel.db');
  const trancada = limitarAoUsoDaApi(abrirBanco(caminho));
  t.after(() => trancada.close());
  assert.throws(() => migrar(trancada), /not authorized/);
  const deMigracao = abrirBanco(caminho);
  assert.ok(migrar(deMigracao).length >= 3);
  deMigracao.close();
});

test('backup restaurado num banco vazio, com a contagem de linhas conferida', async (t) => {
  const { caminho, daApi } = prepararArquivo(t, { trancar: !SEM_AUTORIZADOR });
  const dir = pasta();
  const arquivoDoBackup = join(dir, 'backup.db');
  const doOriginal = await fazerBackup(daApi, arquivoDoBackup);
  assert.ok(existsSync(arquivoDoBackup));
  assert.ok(doOriginal.conclusoes > 100 && doOriginal.itens >= 161);
  const novo = join(dir, 'restaurado.db');
  const { esperado, obtido } = await restaurar(arquivoDoBackup, novo);
  assert.deepEqual(obtido, esperado);
  assert.deepEqual(obtido, doOriginal);
  // O restaurado responde às mesmas consultas.
  const restaurado = abrirBanco(novo);
  t.after(() => restaurado.close());
  const original = abrirBanco(caminho);
  t.after(() => original.close());
  assert.deepEqual(await criarRepositorioSqlite(restaurado).progressoPorTrilha(), await criarRepositorioSqlite(original).progressoPorTrilha());
});

test('o backup não sobrescreve um arquivo, e a restauração só vai para um banco vazio', async (t) => {
  const { daApi } = prepararArquivo(t, { trancar: !SEM_AUTORIZADOR });
  const dir = pasta();
  const arquivo = join(dir, 'backup.db');
  await fazerBackup(daApi, arquivo);
  await assert.rejects(fazerBackup(daApi, arquivo), /já existe/);
  await assert.rejects(restaurar(arquivo, arquivo), /já existe/);
});
