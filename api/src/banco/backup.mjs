// T6.11: backup e restauração do banco, com a contagem de linhas conferida.
// O backup usa a API de backup online do SQLite (node:sqlite): copia página por
// página com o banco em uso, sem parar a API.
// Uso: node src/banco/backup.mjs fazer <destino.db>            (origem: CAMINHO_DO_BANCO)
//      node src/banco/backup.mjs restaurar <backup.db> <novo.db>
import { existsSync } from 'node:fs';
import { backup } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { abrirBanco, caminhoDoBanco } from './conexao.mjs';

export const TABELAS = ['trilhas', 'itens', 'conclusoes', 'schema_migracoes'];

/** Linhas de cada tabela, para comparar o original com o restaurado. */
export function contarLinhas(banco) {
  // O nome vem da lista fixa acima, nunca de quem chama.
  return Object.fromEntries(TABELAS.map((t) => [t, banco.prepare(`SELECT count(*) AS n FROM ${t}`).get().n]));
}

/** Copia o banco aberto para um arquivo novo. Devolve a contagem do original. */
export async function fazerBackup(banco, destino) {
  if (existsSync(destino)) throw new Error(`${destino} já existe: o backup não sobrescreve um arquivo`);
  await backup(banco, destino);
  return contarLinhas(banco);
}

/**
 * Restaura um backup num banco vazio e confere a contagem de linhas.
 * Devolve as contagens; lança erro se alguma tabela não bater.
 */
export async function restaurar(arquivoDoBackup, destino) {
  if (existsSync(destino)) throw new Error(`${destino} já existe: restaure num banco vazio`);
  const origem = abrirBanco(arquivoDoBackup);
  try {
    const esperado = contarLinhas(origem);
    await backup(origem, destino);
    const restaurado = abrirBanco(destino);
    try {
      const obtido = contarLinhas(restaurado);
      const diferentes = TABELAS.filter((t) => obtido[t] !== esperado[t]);
      if (diferentes.length) throw new Error(`contagem diferente em: ${diferentes.join(', ')}`);
      const quebradas = restaurado.prepare('PRAGMA foreign_key_check').all();
      if (quebradas.length) throw new Error(`${quebradas.length} chave(s) estrangeira(s) quebrada(s)`);
      return { esperado, obtido };
    } finally {
      restaurado.close();
    }
  } finally {
    origem.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [acao, a, b] = process.argv.slice(2);
  if (acao === 'fazer' && a) {
    const banco = abrirBanco(caminhoDoBanco());
    console.log('backup feito:', a, await fazerBackup(banco, a));
    banco.close();
  } else if (acao === 'restaurar' && a && b) {
    const { obtido } = await restaurar(a, b);
    console.log('restaurado e conferido:', b, obtido);
  } else {
    console.error('uso: backup.mjs fazer <destino.db> | restaurar <backup.db> <novo.db>');
    process.exit(2);
  }
}
