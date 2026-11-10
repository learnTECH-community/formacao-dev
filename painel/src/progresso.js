// T3.2: progresso por trilha e no total. Funções puras, com testes.

/**
 * @param {{ feito: boolean }[]} itens
 * @returns {{ feitos: number, total: number, percentual: number }}
 */
export function progressoDe(itens) {
  const total = itens.length;
  const feitos = itens.filter((i) => i.feito).length;
  // Sem itens, 0%: nada para dividir. Arredonda para baixo para não mostrar 100% antes da hora.
  const percentual = total === 0 ? 0 : Math.floor((feitos / total) * 100);
  return { feitos, total, percentual };
}

/**
 * @param {{ codigo: string, itens: { feito: boolean }[] }[]} trilhas
 * @returns {Map<string, { feitos: number, total: number, percentual: number }>}
 */
export function progressoPorTrilha(trilhas) {
  return new Map(trilhas.map((t) => [t.codigo, progressoDe(t.itens)]));
}

/**
 * @param {{ itens: { feito: boolean }[] }[]} trilhas
 */
export function progressoTotal(trilhas) {
  return progressoDe(trilhas.flatMap((t) => t.itens));
}

/**
 * Texto equivalente à barra: "3 de 6 itens".
 * @param {{ feitos: number, total: number }} progresso
 */
export function textoDoProgresso({ feitos, total }) {
  return `${feitos} de ${total} ${total === 1 ? 'item' : 'itens'}`;
}
