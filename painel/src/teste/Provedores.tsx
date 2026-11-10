// Provedores do app nos testes: TanStack Query (cliente novo por teste, sem espera entre
// tentativas), preferências e rotas em memória.
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { clienteDeTeste } from './cliente';
import { PreferenciasProvider } from '../estado/PreferenciasProvider';

interface Props {
  children: ReactNode;
  endereco?: string;
  cliente?: QueryClient;
}

export function Provedores({ children, endereco = '/', cliente = clienteDeTeste() }: Props) {
  return (
    <QueryClientProvider client={cliente}>
      <PreferenciasProvider>
        <MemoryRouter initialEntries={[endereco]}>{children}</MemoryRouter>
      </PreferenciasProvider>
    </QueryClientProvider>
  );
}
