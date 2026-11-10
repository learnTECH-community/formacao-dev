// T5.6: repositório em memória, com a mesma interface do SQLite (contrato.mjs).
// Serve aos testes das rotas: nada de arquivo de banco, e cada teste começa vazio.

/** @returns {import('./contrato.mjs').Repositorio} */
export function criarRepositorioEmMemoria() {
  /** @type {import('./contrato.mjs').Conclusao[]} */
  const conclusoes = [];
  let trilhas = [];
  let proximoId = 1;
  const copia = (c) => (c ? { ...c } : null);

  return {
    async saude() {
      return { conclusoes: conclusoes.length };
    },
    async gravarCatalogo(novas) {
      trilhas = structuredClone(novas);
    },
    async registrarConclusao({ item, usuario, pr, concluidaEm }) {
      const existente = conclusoes.find((c) => c.item === item && c.usuario === usuario);
      if (existente) return { conclusao: copia(existente), criada: false };
      const conclusao = { id: proximoId++, item, usuario, pr, concluidaEm };
      conclusoes.push(conclusao);
      return { conclusao: copia(conclusao), criada: true };
    },
    async listarConclusoes({ item, usuario } = {}) {
      return conclusoes
        .filter((c) => (item === undefined || c.item === item) && (usuario === undefined || c.usuario === usuario))
        .map(copia);
    },
    async obterConclusao(id) {
      return copia(conclusoes.find((c) => c.id === id));
    },
    async atualizarConclusao(id, { pr }) {
      const c = conclusoes.find((x) => x.id === id);
      if (!c) return null;
      c.pr = pr;
      return copia(c);
    },
    async apagarConclusao(id) {
      const i = conclusoes.findIndex((c) => c.id === id);
      if (i < 0) return false;
      conclusoes.splice(i, 1);
      return true;
    },
    /** Só para os testes e as consultas em memória: as trilhas guardadas. */
    trilhas: () => trilhas,
  };
}
