// T3.1: transforma o texto do CATALOGO.md em dados.
// Função pura: recebe o texto e devolve as trilhas. Não mexe na página.

const TRILHA = /^## (T\d+) · (.+)$/;
const ITEM = /^- \[( |x)\] \*\*(T\d+\.\d+)\*\* (.+)$/;
const ROADMAPS = /^Roadmaps? de referência:/;
const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/**
 * @param {string} texto conteúdo do CATALOGO.md
 * @returns {{ codigo: string, nome: string, roadmaps: { nome: string, url: string }[],
 *   itens: { codigo: string, texto: string, feito: boolean }[] }[]}
 */
export function lerCatalogo(texto) {
  const trilhas = [];
  for (const linha of texto.split(/\r?\n/)) {
    const trilha = linha.match(TRILHA);
    if (trilha) {
      trilhas.push({ codigo: trilha[1], nome: trilha[2].trim(), roadmaps: [], itens: [] });
      continue;
    }
    const atual = trilhas.at(-1);
    if (!atual) continue;
    if (ROADMAPS.test(linha)) {
      for (const [, nome, url] of linha.matchAll(LINK)) atual.roadmaps.push({ nome, url });
      continue;
    }
    const item = linha.match(ITEM);
    if (item) atual.itens.push({ codigo: item[2], texto: item[3].trim(), feito: item[1] === 'x' });
  }
  return trilhas;
}

/**
 * Divide o texto de um item em pedaços de texto e de código (entre crases).
 * @param {string} texto
 * @returns {{ codigo: boolean, texto: string }[]}
 */
export function pedacosDoTexto(texto) {
  return texto
    .split(/(`[^`]+`)/)
    .filter(Boolean)
    .map((p) =>
      p.length > 2 && p.startsWith('`') && p.endsWith('`') ? { codigo: true, texto: p.slice(1, -1) } : { codigo: false, texto: p },
    );
}
