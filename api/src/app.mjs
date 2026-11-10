// T5.1: a API do Painel de Formação (Express 5 e helmet).
// T5.6: tudo o que o app usa chega por parâmetro (repositório, leitor do catálogo),
// e nenhuma rota importa o banco direto. Nos testes, entra o repositório em memória.
import express from 'express';
import helmet from 'helmet';
import { comConclusoes, leitorDeArquivo, trilhasDoTexto } from './catalogo.mjs';
import { conferirRepositorio } from './repositorios/contrato.mjs';

/**
 * @param {object} opcoes
 * @param {import('./repositorios/contrato.mjs').Repositorio} opcoes.repositorio
 * @param {() => Promise<string>} [opcoes.lerCatalogo] Devolve o texto do CATALOGO.md.
 * @param {string[]} [opcoes.origens] Origens que o CORS aceita (o endereço do painel).
 */
export function criarApp({ repositorio, lerCatalogo = leitorDeArquivo(), origens = [] }) {
  conferirRepositorio(repositorio);
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors(origens));
  app.use(express.json({ limit: '10kb' }));

  const v1 = express.Router();

  // /health lê o repositório: um /health que não toca os dados não prova a conexão.
  v1.get('/health', async (_pedido, resposta) => {
    try {
      const { conclusoes } = await repositorio.saude();
      resposta.json({ situacao: 'ok', repositorio: { situacao: 'ok', conclusoes } });
    } catch {
      resposta.status(503).json({ situacao: 'falha', repositorio: { situacao: 'falha' } });
    }
  });

  v1.get('/catalogo', async (_pedido, resposta) => {
    const trilhas = trilhasDoTexto(await lerCatalogo());
    const conclusoes = await repositorio.listarConclusoes();
    resposta.json({ trilhas: comConclusoes(trilhas, conclusoes) });
  });

  app.use('/v1', v1);
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
