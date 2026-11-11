// Sobe a API. Variáveis (nomes no api/.env.example):
//   PORTA (padrão 4320), ORIGENS_PERMITIDAS (lista separada por vírgula),
//   CAMINHO_CATALOGO (padrão: o CATALOGO.md da raiz),
//   REPOSITORIO (sqlite, memoria ou mongo; padrão sqlite), CAMINHO_DO_BANCO (padrão dados/painel.db),
//   MONGO_URL e MONGO_BANCO (com REPOSITORIO=mongo),
//   ENDERECO (padrão 127.0.0.1; no contêiner, 0.0.0.0),
//   TEMPO_DO_PEDIDO_EM_MS e TEMPO_DOS_CABECALHOS_EM_MS (T10.14).
import { createServer } from 'node:http';
import { criarApp } from './app.mjs';
import { limitarAoUsoDaApi } from './banco/acesso.mjs';
import { abrirBanco, caminhoDoBanco } from './banco/conexao.mjs';
import { migrar } from './banco/migrar.mjs';
import { MongoClient } from 'mongodb';
import { criarRepositorioEmMemoria } from './repositorios/memoria.mjs';
import { criarRepositorioMongo } from './repositorios/mongo.mjs';
import { criarRepositorioSqlite } from './repositorios/sqlite.mjs';
import { opcoesDoServidor } from './tempos.mjs';

const porta = Number(process.env.PORTA) || 4320;
const endereco = process.env.ENDERECO || '127.0.0.1';
const origens = (process.env.ORIGENS_PERMITIDAS ?? 'http://127.0.0.1:4317')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

async function repositorioDoAmbiente(tipo = process.env.REPOSITORIO ?? 'sqlite') {
  if (tipo === 'memoria') return { repositorio: criarRepositorioEmMemoria(), descricao: 'memória' };
  // T6.12: MongoDB, com MONGO_URL e MONGO_BANCO (padrão painel).
  if (tipo === 'mongo') {
    if (!process.env.MONGO_URL) throw new Error('REPOSITORIO=mongo pede MONGO_URL');
    const cliente = await new MongoClient(process.env.MONGO_URL).connect();
    const nome = process.env.MONGO_BANCO || 'painel';
    return { repositorio: await criarRepositorioMongo(cliente.db(nome)), descricao: `MongoDB, banco ${nome}` };
  }
  if (tipo !== 'sqlite') throw new Error(`REPOSITORIO inválido: ${tipo}. Use sqlite, memoria ou mongo.`);
  const caminho = caminhoDoBanco();
  // T6.11: as migrações rodam numa conexão própria, que fecha em seguida;
  // a API usa outra, que só lê e grava linhas.
  const deMigracao = abrirBanco(caminho);
  migrar(deMigracao);
  deMigracao.close();
  const banco = abrirBanco(caminho);
  let acesso = 'só leitura e gravação de linhas';
  try {
    limitarAoUsoDaApi(banco);
  } catch (erro) {
    acesso = `sem a trava de acesso: ${erro.message}`;
  }
  return { repositorio: criarRepositorioSqlite(banco), descricao: `SQLite em ${caminho}, ${acesso}` };
}

const { repositorio, descricao } = await repositorioDoAmbiente();
const app = criarApp({ repositorio, origens });
// T10.14: tempos limite para receber o pedido e os cabeçalhos.
createServer(opcoesDoServidor(), app).listen(porta, endereco, () => {
  console.log(`API em http://${endereco}:${porta}/v1/health (${descricao})`);
});
