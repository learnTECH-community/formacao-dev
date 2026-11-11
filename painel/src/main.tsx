// Ponto de entrada do painel: monta o app React em #app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { PreferenciasProvider } from './estado/PreferenciasProvider';
import { criarClienteDeConsultas } from './consultas';

const raiz = document.getElementById('app');
if (!raiz) throw new Error('Elemento #app não encontrado no index.html');

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={criarClienteDeConsultas()}>
      <PreferenciasProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      </PreferenciasProvider>
    </QueryClientProvider>
  </StrictMode>,
);
