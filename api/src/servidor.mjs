// Sobe a API. Variáveis (nomes no api/.env.example):
//   PORTA (padrão 4320), ORIGENS_PERMITIDAS (lista separada por vírgula),
//   CAMINHO_CATALOGO (padrão: o CATALOGO.md da raiz),
//   REPOSITORIO (sqlite ou memoria; padrão sqlite), CAMINHO_DO_BANCO (padrão dados/painel.db).
import { criarApp } from './app.mjs';
import { abrirBanco, caminhoDoBanco } from './banco/conexao.mjs';
import { migrar } from './banco/migrar.mjs';
import { criarRepositorioEmMemoria } from './repositorios/memoria.mjs';
import { criarRepositorioSqlite } from './repositorios/sqlite.mjs';

const porta = Number(process.env.PORTA) || 4320;
const origens = (process.env.ORIGENS_PERMITIDAS ?? 'http://127.0.0.1:4317')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function repositorioDoAmbiente(tipo = process.env.REPOSITORIO ?? 'sqlite') {
  if (tipo === 'memoria') return { repositorio: criarRepositorioEmMemoria(), descricao: 'memória' };
  if (tipo !== 'sqlite') throw new Error(`REPOSITORIO inválido: ${tipo}. Use sqlite ou memoria.`);
  const caminho = caminhoDoBanco();
  const banco = abrirBanco(caminho);
  migrar(banco);
  return { repositorio: criarRepositorioSqlite(banco), descricao: `SQLite em ${caminho}` };
}

const { repositorio, descricao } = repositorioDoAmbiente();
const app = criarApp({ repositorio, origens });
app.listen(porta, '127.0.0.1', () => {
  console.log(`API em http://127.0.0.1:${porta}/v1/health (${descricao})`);
});
