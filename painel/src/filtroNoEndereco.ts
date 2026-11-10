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

/** Escreve o filtro no endereço. O padrão não aparece, para o link ficar curto. */
export function escreverFiltro({ trilha, situacao }: FiltroEscolhido): URLSearchParams {
  const parametros = new URLSearchParams();
  if (trilha) parametros.set('trilha', trilha);
  if (situacao !== FILTRO_PADRAO.situacao) parametros.set('situacao', situacao);
  return parametros;
}
