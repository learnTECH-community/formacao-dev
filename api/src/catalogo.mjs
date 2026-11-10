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

/** Texto do catálogo → trilhas com itens. O número da issue, "(#89)", vira um campo. */
export function trilhasDoTexto(texto) {
  const { trilhas, erros } = lerCatalogo(texto);
  if (erros.length) throw new Error(`catálogo fora do formato: ${erros[0]}`);
  return trilhas.map((t) => ({
    codigo: t.codigo,
    nome: t.nome,
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
