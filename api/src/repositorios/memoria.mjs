// T5.6: repositório em memória, com a mesma interface do de banco (contrato.mjs).
// Serve aos testes das rotas: nada de arquivo de banco, e cada teste começa vazio.

/** @returns {import('./contrato.mjs').Repositorio} */
export function criarRepositorioEmMemoria() {
  /** @type {import('./contrato.mjs').Conclusao[]} */
  const conclusoes = [];
  let proximoId = 1;

  return {
    async saude() {
      return { conclusoes: conclusoes.length };
    },
    async registrarConclusao({ item, usuario, pr, concluidaEm }) {
      const existente = conclusoes.find((c) => c.item === item && c.usuario === usuario);
      if (existente) return { conclusao: { ...existente }, criada: false };
      const conclusao = { id: proximoId++, item, usuario, pr, concluidaEm };
      conclusoes.push(conclusao);
      return { conclusao: { ...conclusao }, criada: true };
    },
    async listarConclusoes({ item, usuario } = {}) {
      return conclusoes
        .filter((c) => (item === undefined || c.item === item) && (usuario === undefined || c.usuario === usuario))
        .map((c) => ({ ...c }));
    },
  };
}
