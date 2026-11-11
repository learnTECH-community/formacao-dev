// T3.3: filtro dos itens por trilha e por situação. Funções puras, com testes.
import type { Filtro, Item, Situacao } from './tipos';

/** Situações aceitas no filtro. */
export const SITUACOES: readonly Situacao[] = ['todos', 'feitos', 'a-fazer'];

/** Confere se um texto vindo da página é uma situação válida. */
export function ehSituacao(valor: string): valor is Situacao {
  return (SITUACOES as readonly string[]).includes(valor);
}

/**
 * Devolve só as trilhas e os itens que passam no filtro. Trilha sem item que passe sai da lista.
 * Genérica para aceitar trilhas com mais campos (nome, roadmaps) e devolvê-los intactos.
 */
export function filtrarItens<T extends { codigo: string; itens: Pick<Item, 'feito'>[] }>(
  trilhas: T[],
  { trilha = '', situacao = 'todos' }: Filtro = {},
): T[] {
  const passa = (item: Pick<Item, 'feito'>): boolean =>
    situacao === 'feitos' ? item.feito : situacao === 'a-fazer' ? !item.feito : true;
  return trilhas
    .filter((t) => !trilha || t.codigo === trilha)
    .map((t) => ({ ...t, itens: t.itens.filter(passa) }))
    .filter((t) => t.itens.length > 0);
}

/** Frase do aviso lido por leitor de tela: "Mostrando 5 de 63 itens." */
export function textoDaContagem(mostrados: number, total: number): string {
  if (mostrados === 0) return 'Nenhum item com esses filtros.';
  if (mostrados === total) return `Mostrando todos os ${total} itens.`;
  return `Mostrando ${mostrados} de ${total} ${total === 1 ? 'item' : 'itens'}.`;
}
