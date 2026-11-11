// Busca o CATALOGO.md e devolve o estado da busca: carregando, erro, vazio ou pronto.
// T3.5: cada estado tem resposta na tela. O pedido é cancelado se ninguém mais o espera.
// T4.11: a busca passa pelo TanStack Query (cache, novas tentativas e atualização em
// segundo plano); a tela continua recebendo os mesmos quatro estados.
import { useQuery } from '@tanstack/react-query';
import { trilhasDaApi, urlDaApi, type CatalogoDaApi } from './api';
import { lerCatalogo } from './catalogo';
import { chaves } from './consultas';
import type { Trilha } from './tipos';

export type EstadoDoCatalogo =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; erro: unknown }
  | { situacao: 'vazio' }
  | { situacao: 'pronto'; trilhas: Trilha[] };

export type Catalogo = EstadoDoCatalogo & { tentarDeNovo: () => void };

/** Endereço do catálogo, ao lado do index.html no build (vale em qualquer rota). */
export const ENDERECO_DO_CATALOGO = `${import.meta.env.BASE_URL}CATALOGO.md`;

/** T5.8: com a API configurada (VITE_API_URL), o catálogo vem dela, com as conclusões. */
export function enderecoPadrao(api = urlDaApi()): string {
  return api ? `${api}/v1/catalogo` : ENDERECO_DO_CATALOGO;
}

type Lido = Extract<EstadoDoCatalogo, { situacao: 'vazio' | 'pronto' }>;

/** Busca e lê o catálogo. Sem item nenhum, devolve "vazio". */
export async function buscarCatalogo(endereco: string, sinal?: AbortSignal): Promise<Lido> {
  // Endereço absoluto a partir da página: funciona no navegador e no Node dos testes.
  const url = typeof location === 'undefined' ? endereco : new URL(endereco, location.href).href;
  const resposta = await fetch(url, { cache: 'no-cache', signal: sinal });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  // A API responde JSON; o arquivo estático, o texto do CATALOGO.md.
  const json = resposta.headers.get('content-type')?.includes('application/json');
  const trilhas = json ? trilhasDaApi((await resposta.json()) as CatalogoDaApi) : lerCatalogo(await resposta.text());
  if (trilhas.flatMap((t) => t.itens).length === 0) return { situacao: 'vazio' };
  return { situacao: 'pronto', trilhas };
}

/** Mensagem curta para a pessoa, sem detalhe técnico demais. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof TypeError) return 'Não conseguimos falar com o servidor. Confira a conexão.';
  const detalhe = erro instanceof Error ? erro.message : String(erro);
  return `O servidor respondeu com erro (${detalhe}).`;
}

function opcoesDoCatalogo(endereco: string) {
  return {
    queryKey: [...chaves.catalogo, endereco] as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => buscarCatalogo(endereco, signal),
  };
}

export function useCatalogo(endereco: string = enderecoPadrao()): Catalogo {
  const consulta = useQuery(opcoesDoCatalogo(endereco));
  const tentarDeNovo = () => void consulta.refetch();
  // Depois de um erro, a nova tentativa volta a mostrar "carregando".
  if (consulta.isPending || (consulta.isError && consulta.isFetching)) return { situacao: 'carregando', tentarDeNovo };
  if (consulta.isError) return { situacao: 'erro', erro: consulta.error, tentarDeNovo };
  return { ...consulta.data, tentarDeNovo };
}

/**
 * T4.11: uma trilha, com chave de consulta própria (["catalogo", "trilha", "T2", versão]).
 * Lê o catálogo já em cache, sem pedir o arquivo de novo; a versão (hora em que o catálogo
 * chegou) entra na chave, para a trilha acompanhar a atualização em segundo plano.
 * Devolve undefined enquanto carrega e null se a trilha não existe.
 */
export function useTrilha(codigo: string, endereco: string = enderecoPadrao()): Trilha | null | undefined {
  const catalogo = useQuery(opcoesDoCatalogo(endereco));
  const daTrilha = (): Trilha | null =>
    catalogo.data?.situacao === 'pronto' ? (catalogo.data.trilhas.find((t) => t.codigo === codigo) ?? null) : null;
  const consulta = useQuery({
    queryKey: [...chaves.trilha(codigo), catalogo.dataUpdatedAt] as const,
    enabled: catalogo.isSuccess,
    queryFn: daTrilha,
    // Já na primeira renderização, sem esperar um ciclo: o foco vai direto ao título da trilha.
    initialData: catalogo.isSuccess ? daTrilha : undefined,
    initialDataUpdatedAt: catalogo.dataUpdatedAt,
  });
  return consulta.data;
}
