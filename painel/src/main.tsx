// Ponto de entrada do painel: monta o app React em #app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';

const raiz = document.getElementById('app');
if (!raiz) throw new Error('Elemento #app não encontrado no index.html');

createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
