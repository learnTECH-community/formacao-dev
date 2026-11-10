// Cliente do TanStack Query nos testes: novo a cada teste e sem espera entre tentativas.
import type { QueryClient } from '@tanstack/react-query';
import { criarClienteDeConsultas } from '../consultas';

export function clienteDeTeste(): QueryClient {
  return criarClienteDeConsultas({ espera: () => 0 });
}
