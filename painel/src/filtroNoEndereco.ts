// T4.2: o filtro fica no endereço da página (?trilha=T2&situacao=feitos).
// Funções puras: leem e escrevem os parâmetros, com testes de unidade.
import { ehSituacao } from './filtro';
import type { Situacao } from './tipos';

export interface FiltroEscolhido {
  /** Código da trilha; vazio quer dizer todas. */
  trilha: string;
  situacao: Situacao;
}

export const FILTRO_PADRAO: FiltroEscolhido = { trilha: '', situacao: 'todos' };

/**
 * Lê o filtro do endereço. Valor que não existe (trilha fora do catálogo, situação
 * desconhecida) cai no padrão, sem erro.
 */
export function lerFiltro(parametros: URLSearchParams, codigos: readonly string[]): FiltroEscolhido {
  const trilha = parametros.get('trilha') ?? '';
  const situacao = parametros.get('situacao') ?? '';
  return {
    trilha: codigos.includes(trilha) ? trilha : FILTRO_PADRAO.trilha,
    situacao: ehSituacao(situacao) ? situacao : FILTRO_PADRAO.situacao,
  };
}

/**
 * #348: a trilha pedida no endereço que não existe no catálogo (por exemplo, `?trilha=T99`).
 * Devolve o código pedido, cortado em 20 caracteres, ou `null` quando não há o que avisar.
 * Sem catálogo carregado (`codigos` vazio), não avisa: ainda não dá para saber.
 */
export function trilhaInexistente(parametros: URLSearchParams, codigos: readonly string[]): string | null {
  const pedida = (parametros.get('trilha') ?? '').trim();
  if (!pedida || !codigos.some(Boolean) || codigos.includes(pedida)) return null;
  return pedida.slice(0, 20);
}

/** O aviso lido junto com a contagem: diz o que houve e o que a página fez. */
export function textoDaTrilhaInexistente(codigo: string): string {
  return `A trilha ${codigo} não existe; o filtro voltou para todas as trilhas.`;
}

/** Escreve o filtro no endereço. O padrão não aparece, para o link ficar curto. */
export function escreverFiltro({ trilha, situacao }: FiltroEscolhido): URLSearchParams {
  const parametros = new URLSearchParams();
  if (trilha) parametros.set('trilha', trilha);
  if (situacao !== FILTRO_PADRAO.situacao) parametros.set('situacao', situacao);
  return parametros;
}
