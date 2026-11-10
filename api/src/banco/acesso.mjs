// T6.11: acesso mínimo. O SQLite não tem usuários: quem abre o arquivo pode tudo.
// O equivalente aqui é a conexão: a da API recebe um "autorizador" que só deixa
// ler e gravar linhas (SELECT, INSERT, UPDATE, DELETE e transações). Criar, mudar
// ou apagar tabela, índice ou view, anexar outro banco e mudar PRAGMA são recusados.
// As migrações rodam noutra conexão, sem essa trava (o "usuário de migração").
// Num banco com usuários (Postgres), a mesma separação vira dois papéis com GRANT
// (ver docs/backup.md).
import { constants } from 'node:sqlite';

const PERMITIDAS = new Set(
  ['SQLITE_SELECT', 'SQLITE_READ', 'SQLITE_INSERT', 'SQLITE_UPDATE', 'SQLITE_DELETE', 'SQLITE_TRANSACTION', 'SQLITE_SAVEPOINT', 'SQLITE_FUNCTION', 'SQLITE_RECURSIVE'].map(
    (n) => constants[n],
  ),
);

/** PRAGMAs só de leitura que o node:sqlite e as consultas usam. */
const PRAGMAS_DE_LEITURA = new Set(['foreign_keys', 'busy_timeout', 'journal_mode', 'foreign_key_check', 'table_info', 'index_list', 'index_info', 'foreign_key_list']);

/** Tranca a conexão para o uso da API. Devolve a mesma conexão. */
export function limitarAoUsoDaApi(banco) {
  if (typeof banco.setAuthorizer !== 'function') {
    throw new Error('este Node não tem DatabaseSync.setAuthorizer; use o Node 24.10 ou mais novo');
  }
  banco.setAuthorizer((acao, primeiro, segundo) => {
    if (PERMITIDAS.has(acao)) return constants.SQLITE_OK;
    // PRAGMA sem valor (segundo == null) só lê; com valor, muda a configuração.
    if (acao === constants.SQLITE_PRAGMA && PRAGMAS_DE_LEITURA.has(primeiro) && segundo == null) return constants.SQLITE_OK;
    return constants.SQLITE_DENY;
  });
  return banco;
}
