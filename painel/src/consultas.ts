// T4.11: cliente do TanStack Query: cache, novas tentativas e chaves de consulta.
import { QueryClient } from '@tanstack/react-query';

/** Chaves de consulta: o catálogo inteiro e cada trilha. */
export const chaves = {
  catalogo: ['catalogo'] as const,
  trilha: (codigo: string) => ['catalogo', 'trilha', codigo] as const,
};

/** Até duas novas tentativas, só em falha de rede (TypeError do fetch). Erro HTTP não repete. */
export function deveTentarDeNovo(falhas: number, erro: unknown): boolean {
  return erro instanceof TypeError && falhas < 2;
}

export function criarClienteDeConsultas({ espera = (n: number) => Math.min(500 * 2 ** n, 2000) } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: deveTentarDeNovo,
        retryDelay: espera,
        // O catálogo muda pouco: por 5 minutos, voltar à página mostra o que está em cache
        // sem buscar de novo; depois, mostra o cache e atualiza em segundo plano.
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: true,
      },
    },
  });
}
