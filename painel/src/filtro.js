// T3.3: filtro dos itens por trilha e por situação. Funções puras, com testes.

/** Situações aceitas no filtro. */
export const SITUACOES = ['todos', 'feitos', 'a-fazer'];

/**
 * Devolve só as trilhas e os itens que passam no filtro. Trilha sem item que passe sai da lista.
 * @param {{ codigo: string, itens: { feito: boolean }[] }[]} trilhas
 * @param {{ trilha?: string, situacao?: string }} filtro trilha vazia = todas
 */
export function filtrarItens(trilhas, { trilha = '', situacao = 'todos' } = {}) {
  const passa = (item) =>
    situacao === 'feitos' ? item.feito : situacao === 'a-fazer' ? !item.feito : true;
  return trilhas
    .filter((t) => !trilha || t.codigo === trilha)
    .map((t) => ({ ...t, itens: t.itens.filter(passa) }))
    .filter((t) => t.itens.length > 0);
}

/**
 * Frase do aviso lido por leitor de tela: "Mostrando 5 de 63 itens."
 * @param {number} mostrados
 * @param {number} total
 */
export function textoDaContagem(mostrados, total) {
  if (mostrados === 0) return 'Nenhum item com esses filtros.';
  if (mostrados === total) return `Mostrando todos os ${total} itens.`;
  return `Mostrando ${mostrados} de ${total} ${total === 1 ? 'item' : 'itens'}.`;
}
