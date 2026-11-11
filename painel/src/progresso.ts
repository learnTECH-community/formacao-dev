// T3.2: progresso por trilha e no total. Funções puras, com testes.
import type { Item, Progresso, Trilha } from './tipos';

export function progressoDe(itens: Pick<Item, 'feito'>[]): Progresso {
  const total = itens.length;
  const feitos = itens.filter((i) => i.feito).length;
  // Sem itens, 0%: nada para dividir. Arredonda para baixo para não mostrar 100% antes da hora.
  const percentual = total === 0 ? 0 : Math.floor((feitos / total) * 100);
  return { feitos, total, percentual };
}

type TrilhaComItens = Pick<Trilha, 'codigo'> & { itens: Pick<Item, 'feito'>[] };

export function progressoPorTrilha(trilhas: TrilhaComItens[]): Map<string, Progresso> {
  return new Map(trilhas.map((t) => [t.codigo, progressoDe(t.itens)]));
}

export function progressoTotal(trilhas: { itens: Pick<Item, 'feito'>[] }[]): Progresso {
  return progressoDe(trilhas.flatMap((t) => t.itens));
}

/** Texto equivalente à barra: "3 de 6 itens". */
export function textoDoProgresso({ feitos, total }: Pick<Progresso, 'feitos' | 'total'>): string {
  return `${feitos} de ${total} ${total === 1 ? 'item' : 'itens'}`;
}
