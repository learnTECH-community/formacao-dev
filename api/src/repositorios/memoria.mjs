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
    async progressoPorTrilha() {
      const feito = (i) => i.feito || conclusoes.some((c) => c.item === i.codigo);
      return trilhas.map((t) => {
        const total = t.itens.length;
        const feitos = t.itens.filter(feito).length;
        return { trilha: t.codigo, nome: t.nome, feitos, total, percentual: total === 0 ? 0 : Math.floor((feitos * 100) / total) };
      });
    },
    async ranking() {
      const contagem = [...Map.groupBy(conclusoes, (c) => c.usuario)].map(([usuario, l]) => ({ usuario, concluidos: l.length }));
      const vezes = Map.groupBy(contagem, (p) => p.concluidos);
      return contagem
        .map((p) => ({
          posicao: 1 + contagem.filter((o) => o.concluidos > p.concluidos).length,
          usuario: p.usuario,
          concluidos: p.concluidos,
          empatado: vezes.get(p.concluidos).length > 1,
        }))
        .sort((a, b) => a.posicao - b.posicao || (a.usuario < b.usuario ? -1 : 1));
    },
    async progressoSemanal() {
      const segunda = (iso) => {
        const d = new Date(iso);
        const dia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        dia.setUTCDate(dia.getUTCDate() - ((dia.getUTCDay() + 6) % 7));
        return dia.toISOString().slice(0, 10);
      };
      const porSemana = [...Map.groupBy(conclusoes, (c) => segunda(c.concluidaEm))].sort(([a], [b]) => (a < b ? -1 : 1));
      let acumulado = 0;
      return porSemana.map(([semana, l]) => ({ semana, concluidas: l.length, acumulado: (acumulado += l.length) }));
    },
    async concluintesDaTrilha(codigo) {
      const itens = trilhas.find((t) => t.codigo === codigo)?.itens ?? [];
      if (itens.length === 0) return [];
      const daTrilha = conclusoes.filter((c) => itens.some((i) => i.codigo === c.item));
      return [...Map.groupBy(daTrilha, (c) => c.usuario)]
        .filter(([, lista]) => lista.length === itens.length)
        .map(([usuario, lista]) => ({ usuario, concluiu_em: lista.map((c) => c.concluidaEm).sort().at(-1) }))
        .sort((a, b) => (a.concluiu_em < b.concluiu_em ? -1 : a.concluiu_em > b.concluiu_em ? 1 : a.usuario < b.usuario ? -1 : 1));
    },
    async progressoPorPessoa() {
      const trilhaDo = new Map(trilhas.flatMap((t) => t.itens.map((i) => [i.codigo, t.codigo])));
      const totalDeItens = trilhaDo.size;
      const porPessoa = Map.groupBy(conclusoes.filter((c) => trilhaDo.has(c.item)), (c) => c.usuario);
      return [...porPessoa]
        .map(([usuario, lista]) => {
          const datas = lista.map((c) => c.concluidaEm).sort();
          return {
            usuario,
            concluidos: lista.length,
            trilhas: new Set(lista.map((c) => trilhaDo.get(c.item))).size,
            percentual: Math.floor((lista.length * 100) / totalDeItens),
            primeira: datas[0],
            ultima: datas.at(-1),
          };
        })
        .sort((a, b) => b.concluidos - a.concluidos || (a.usuario < b.usuario ? -1 : a.usuario > b.usuario ? 1 : 0));
    },
  };
}
