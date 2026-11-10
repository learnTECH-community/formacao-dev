// T5.1: a API do Painel de Formação (Express 5 e helmet).
// T5.6: tudo o que o app usa chega por parâmetro (repositório, leitor do catálogo,
// relógio, log), e nenhuma rota importa o banco direto. Nos testes, entra o
// repositório em memória.
import express from 'express';
import helmet from 'helmet';
import { comConclusoes, itemExiste, leitorDeArquivo, trilhasDoTexto } from './catalogo.mjs';
import { ErroDaApi, rotaNaoEncontrada, tratarErros } from './erros.mjs';
import { conferirRepositorio } from './repositorios/contrato.mjs';
import { esquemaDaConclusao, validar } from './validacao.mjs';

const LOG_PADRAO = { info: () => {}, error: (dados) => console.error(JSON.stringify(dados)) };

/**
 * @param {object} opcoes
 * @param {import('./repositorios/contrato.mjs').Repositorio} opcoes.repositorio
 * @param {() => Promise<string>} [opcoes.lerCatalogo] Devolve o texto do CATALOGO.md.
 * @param {string[]} [opcoes.origens] Origens que o CORS aceita (o endereço do painel).
 * @param {() => Date} [opcoes.relogio]
 * @param {{ info: Function, error: Function }} [opcoes.log]
 */
export function criarApp({ repositorio, lerCatalogo = leitorDeArquivo(), origens = [], relogio = () => new Date(), log = LOG_PADRAO }) {
  conferirRepositorio(repositorio);
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors(origens));
  app.use(express.json({ limit: '10kb' }));

  const trilhas = async () => trilhasDoTexto(await lerCatalogo());
  const v1 = express.Router();

  // /health lê o repositório: um /health que não toca os dados não prova a conexão.
  v1.get('/health', async (_pedido, resposta) => {
    try {
      const { conclusoes } = await repositorio.saude();
      resposta.json({ situacao: 'ok', repositorio: { situacao: 'ok', conclusoes } });
    } catch {
      throw new ErroDaApi('indisponivel', 'O repositório de dados não respondeu.', { situacao: 'falha', repositorio: { situacao: 'falha' } });
    }
  });

  v1.get('/catalogo', async (_pedido, resposta) => {
    const conclusoes = await repositorio.listarConclusoes();
    resposta.json({ trilhas: comConclusoes(await trilhas(), conclusoes) });
  });

  // T5.2: registrar uma conclusão. 201 na primeira vez; 200 se já existia (T6.5).
  v1.post('/conclusoes', async (pedido, resposta) => {
    const dados = validar(esquemaDaConclusao, pedido.body);
    if (!itemExiste(await trilhas(), dados.item)) {
      throw new ErroDaApi('nao-encontrado', `O item ${dados.item} não existe no catálogo.`);
    }
    const { conclusao, criada } = await repositorio.registrarConclusao({ ...dados, concluidaEm: relogio().toISOString() });
    resposta.status(criada ? 201 : 200).json(conclusao);
  });

  app.use('/v1', v1);
  app.use(rotaNaoEncontrada);
  app.use(tratarErros(log));
  return app;
}

/** CORS só para as origens configuradas; as demais não recebem o cabeçalho. */
function cors(origens) {
  const aceitas = new Set(origens);
  return (pedido, resposta, seguir) => {
    const origem = pedido.get('origin');
    if (origem && aceitas.has(origem)) {
      resposta.set('Access-Control-Allow-Origin', origem);
      resposta.set('Vary', 'Origin');
      resposta.set('Access-Control-Allow-Headers', 'Content-Type, If-None-Match');
      resposta.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (pedido.method === 'OPTIONS') return resposta.sendStatus(204);
    seguir();
  };
}
