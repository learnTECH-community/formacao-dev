// Lê o CATALOGO.md da raiz com o mesmo leitor do CI (scripts/catalogo.mjs)
// e junta as conclusões do repositório: quem fez cada item e o PR.
import { readFile } from 'node:fs/promises';
import { lerCatalogo } from '../../scripts/catalogo.mjs';

export const CAMINHO_PADRAO = new URL('../../CATALOGO.md', import.meta.url);

/** Lê o arquivo do catálogo. O caminho vem da variável CAMINHO_CATALOGO ou é o da raiz. */
export function leitorDeArquivo(caminho = process.env.CAMINHO_CATALOGO ?? CAMINHO_PADRAO) {
  return () => readFile(caminho, 'utf8');
}

const ISSUE = /\s*\(#(\d+)\)\s*$/;
const TRILHA = /^## (T\d+) · /;
const ROADMAPS = /^Roadmaps? de referência:/;
const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** Links do roadmap.sh de cada trilha (linha "Roadmap de referência:"), como no painel. */
function roadmapsDoTexto(texto) {
  const porTrilha = new Map();
  let atual;
  for (const linha of texto.split(/\r?\n/)) {
    const t = linha.match(TRILHA);
    if (t) atual = t[1];
    else if (atual && ROADMAPS.test(linha)) porTrilha.set(atual, [...linha.matchAll(LINK)].map(([, nome, url]) => ({ nome, url })));
  }
  return porTrilha;
}

/** Texto do catálogo → trilhas com itens. O número da issue, "(#89)", vira um campo. */
export function trilhasDoTexto(texto) {
  const { trilhas, erros } = lerCatalogo(texto);
  if (erros.length) throw new Error(`catálogo fora do formato: ${erros[0]}`);
  const roadmaps = roadmapsDoTexto(texto);
  return trilhas.map((t) => ({
    codigo: t.codigo,
    nome: t.nome,
    roadmaps: roadmaps.get(t.codigo) ?? [],
    itens: t.itens.map((i) => {
      const issue = i.texto.match(ISSUE);
      return {
        codigo: i.codigo,
        texto: i.texto.replace(ISSUE, ''),
        feito: i.feito,
        ...(issue && { issue: Number(issue[1]) }),
      };
    }),
  }));
}

/**
 * Junta as conclusões aos itens. Um item conta como feito se está marcado no
 * catálogo ou se tem um PR registrado (T5.4).
 */
export function comConclusoes(trilhas, conclusoes) {
  const porItem = Map.groupBy(conclusoes, (c) => c.item);
  return trilhas.map((t) => ({
    ...t,
    itens: t.itens.map((i) => {
      const doItem = (porItem.get(i.codigo) ?? []).map(({ usuario, pr }) => ({ usuario, pr }));
      return { ...i, feito: i.feito || doItem.length > 0, conclusoes: doItem };
    }),
  }));
}

export function itemExiste(trilhas, codigo) {
  return trilhas.some((t) => t.itens.some((i) => i.codigo === codigo));
}
