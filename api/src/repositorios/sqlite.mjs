// T6.6: repositório SQLite, com a mesma interface do de memória (contrato.mjs).
// Toda consulta é preparada uma vez e recebe os valores por parâmetro (?):
// nenhum texto vindo de fora entra na string SQL. Um teste confere isso.
// T6.5: a conclusão repetida não falha e não duplica, nem com pedidos
// simultâneos: quem garante é a restrição UNIQUE (item, usuario) do banco,
// com INSERT ... ON CONFLICT DO NOTHING.
import { gravarCatalogo } from '../banco/catalogo.mjs';

const daLinha = (l) => (l ? { id: l.id, item: l.item, usuario: l.usuario, pr: l.pr, concluidaEm: l.concluida_em } : null);

/**
 * @param {import('node:sqlite').DatabaseSync} banco Já migrado (src/banco/migrar.mjs).
 * @returns {import('./contrato.mjs').Repositorio}
 */
export function criarRepositorioSqlite(banco) {
  const sql = {
    contar: banco.prepare('SELECT count(*) AS n FROM conclusoes'),
    inserir: banco.prepare(`INSERT INTO conclusoes (item, usuario, pr, concluida_em) VALUES (?, ?, ?, ?)
      ON CONFLICT (item, usuario) DO NOTHING
      RETURNING id, item, usuario, pr, concluida_em`),
    daPessoaNoItem: banco.prepare('SELECT id, item, usuario, pr, concluida_em FROM conclusoes WHERE item = ? AND usuario = ?'),
    // Filtro opcional sem montar SQL: "? IS NULL" deixa passar tudo quando o filtro não vem.
    listar: banco.prepare(`SELECT id, item, usuario, pr, concluida_em FROM conclusoes
      WHERE (:item IS NULL OR item = :item) AND (:usuario IS NULL OR usuario = :usuario)
      ORDER BY id`),
    obter: banco.prepare('SELECT id, item, usuario, pr, concluida_em FROM conclusoes WHERE id = ?'),
    atualizar: banco.prepare('UPDATE conclusoes SET pr = ? WHERE id = ? RETURNING id, item, usuario, pr, concluida_em'),
    apagar: banco.prepare('DELETE FROM conclusoes WHERE id = ?'),
  };

  return {
    async saude() {
      return { conclusoes: sql.contar.get().n };
    },
    async gravarCatalogo(trilhas) {
      gravarCatalogo(banco, trilhas);
    },
    async registrarConclusao({ item, usuario, pr, concluidaEm }) {
      const nova = sql.inserir.get(item, usuario, pr, concluidaEm);
      if (nova) return { conclusao: daLinha(nova), criada: true };
      return { conclusao: daLinha(sql.daPessoaNoItem.get(item, usuario)), criada: false };
    },
    async listarConclusoes({ item = null, usuario = null } = {}) {
      return sql.listar.all({ item, usuario }).map(daLinha);
    },
    async obterConclusao(id) {
      return daLinha(sql.obter.get(id));
    },
    async atualizarConclusao(id, { pr }) {
      return daLinha(sql.atualizar.get(pr, id));
    },
    async apagarConclusao(id) {
      return sql.apagar.run(id).changes > 0;
    },
  };
}
