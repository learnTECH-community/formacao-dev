// Sobe a API. Variáveis (nomes no api/.env.example):
//   PORTA (padrão 4320), ORIGENS_PERMITIDAS (lista separada por vírgula),
//   CAMINHO_CATALOGO (padrão: o CATALOGO.md da raiz).
import { criarApp } from './app.mjs';
import { criarRepositorioEmMemoria } from './repositorios/memoria.mjs';

const porta = Number(process.env.PORTA) || 4320;
const origens = (process.env.ORIGENS_PERMITIDAS ?? 'http://127.0.0.1:4317')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = criarApp({ repositorio: criarRepositorioEmMemoria(), origens });
app.listen(porta, '127.0.0.1', () => {
  console.log(`API em http://127.0.0.1:${porta}/v1/health`);
});
