// T5.12: GET /v1/itens com filtros por trilha e situação e paginação,
// e GET /v1/itens/:codigo. Filtro inválido recebe 400; item que não existe, 404.
import { z } from 'zod';
import { comConclusoes } from '../catalogo.mjs';
import { ErroDaApi } from '../erros.mjs';
import { jsonComEtag } from '../cache.mjs';
import { CODIGO_DO_ITEM, validar } from '../validacao.mjs';

export const LIMITE_PADRAO = 20;
export const LIMITE_MAXIMO = 50;

const inteiro = (campo, min, max) =>
  z
    .string({ error: `${campo} precisa ser um valor só.` })
    .regex(/^\d+$/, { error: `${campo} precisa ser um número inteiro.` })
    .transform(Number)
    .pipe(z.number().min(min, { error: `${campo} precisa ser no mínimo ${min}.` }).max(max, { error: `${campo} pode ser no máximo ${max}.` }));

export const esquemaDoFiltro = z.strictObject(
  {
    trilha: z.string({ error: 'trilha precisa ser um valor só, no formato Tn.' }).regex(/^T\d+$/, { error: 'trilha precisa estar no formato Tn, como T2.' }).optional(),
    situacao: z.enum(['todos', 'feitos', 'a-fazer'], { error: 'situacao precisa ser todos, feitos ou a-fazer.' }).default('todos'),
    limite: inteiro('limite', 1, LIMITE_MAXIMO).default(LIMITE_PADRAO),
    pagina: inteiro('pagina', 1, 100_000).default(1),
  },
  { error: (i) => (i.code === 'unrecognized_keys' ? `Filtro desconhecido: ${i.keys.join(', ')}.` : undefined) },
);

/** Os itens de todas as trilhas, numa lista só, com o código da trilha em cada um. */
export function itensDoCatalogo(trilhas) {
  return trilhas.flatMap((t) => t.itens.map((i) => ({ ...i, trilha: t.codigo })));
}

/** Aplica o filtro e corta a página. Devolve também o total, antes da paginação. */
export function paginar(itens, { trilha, situacao, limite, pagina }) {
  const filtrados = itens.filter(
    (i) => (trilha === undefined || i.trilha === trilha) && (situacao === 'todos' || i.feito === (situacao === 'feitos')),
  );
  const inicio = (pagina - 1) * limite;
  return { total: filtrados.length, itens: filtrados.slice(inicio, inicio + limite), haMais: inicio + limite < filtrados.length };
}

function enderecoDaPagina(filtro, pagina) {
  const busca = new URLSearchParams();
  if (filtro.trilha) busca.set('trilha', filtro.trilha);
  if (filtro.situacao !== 'todos') busca.set('situacao', filtro.situacao);
  busca.set('limite', String(filtro.limite));
  busca.set('pagina', String(pagina));
  return `/v1/itens?${busca}`;
}

export function rotasDeItens({ rota, trilhas, repositorio }) {
  const itensComConclusoes = async () => itensDoCatalogo(comConclusoes(await trilhas(), await repositorio.listarConclusoes()));

  rota('get', '/itens', async (pedido, resposta) => {
    const filtro = validar(esquemaDoFiltro, { ...pedido.query });
    const todos = await itensComConclusoes();
    if (filtro.trilha && !todos.some((i) => i.trilha === filtro.trilha)) {
      throw new ErroDaApi('validacao', `A trilha ${filtro.trilha} não existe.`, {
        erros: [{ campo: 'trilha', mensagem: `A trilha ${filtro.trilha} não existe.` }],
      });
    }
    const { total, itens, haMais } = paginar(todos, filtro);
    const proxima = haMais ? enderecoDaPagina(filtro, filtro.pagina + 1) : null;
    if (proxima) resposta.set('Link', `<${proxima}>; rel="next"`);
    jsonComEtag(pedido, resposta, { itens, total, pagina: filtro.pagina, limite: filtro.limite, proxima });
  });

  rota('get', '/itens/:codigo', async (pedido, resposta) => {
    const { codigo } = pedido.params;
    if (!CODIGO_DO_ITEM.test(codigo)) {
      throw new ErroDaApi('validacao', 'O código do item precisa estar no formato Tn.m, como T2.3.', {
        erros: [{ campo: 'codigo', mensagem: 'codigo precisa estar no formato Tn.m, como T2.3.' }],
      });
    }
    const item = (await itensComConclusoes()).find((i) => i.codigo === codigo);
    if (!item) throw new ErroDaApi('nao-encontrado', `O item ${codigo} não existe no catálogo.`);
    jsonComEtag(pedido, resposta, item);
  });
}
