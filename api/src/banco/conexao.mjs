// Abre o banco SQLite com node:sqlite (Node 22.13+), sem dependência nativa. A trava de acesso da T6.11 pede o Node 24.10.
// As chaves estrangeiras do SQLite vêm desligadas: liga em toda conexão.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const CAMINHO_PADRAO = 'dados/painel.db';

export function caminhoDoBanco(valor = process.env.CAMINHO_DO_BANCO) {
  return valor || CAMINHO_PADRAO;
}

/** Abre (e cria, se preciso) o banco. ":memory:" abre um banco só na memória. */
export function abrirBanco(caminho = caminhoDoBanco()) {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
  const banco = new DatabaseSync(caminho);
  banco.exec('PRAGMA foreign_keys = ON');
  // Espera até 5 s por uma trava, em vez de falhar na hora (dois processos no mesmo arquivo).
  banco.exec('PRAGMA busy_timeout = 5000');
  if (caminho !== ':memory:') banco.exec('PRAGMA journal_mode = WAL');
  return banco;
}
