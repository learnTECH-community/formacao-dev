// T5.1: a API do Painel de Formação (Express 5 e helmet).
// T5.6: tudo o que o app usa chega por parâmetro (repositório, leitor do catálogo,
// relógio, log), e nenhuma rota importa o banco direto. Nos testes, entra o
// repositório em memória.
import express from 'express';
import helmet from 'helmet';
import { configDoAmbiente, criarSessoes, exigirPapel, lerSessao, rotasDeAutenticacao } from './autenticacao.mjs';
import { emCache, jsonComEtag, tempoDoCache } from './cache.mjs';
import { comConclusoes, itemExiste, leitorDeArquivo, trilhasDoTexto } from './catalogo.mjs';
import { ErroDaApi, rotaNaoEncontrada, tratarErros } from './erros.mjs';
import { criarClienteDoGitHub, sincronizar } from './github.mjs';
import { limitarPedidos, limiteDoAmbiente } from './limite.mjs';
import { criarLog, registrarPedidos } from './log.mjs';
import { conferirRepositorio } from './repositorios/contrato.mjs';
import { rotaDoCsv } from './rotas/csv.mjs';
import { rotasDeItens } from './rotas/itens.mjs';
import { rotasDeProgresso } from './rotas/progresso.mjs';
import { esquemaDaConclusao, validar } from './validacao.mjs';
import { OBSOLETAS, obsoleta } from './versao.mjs';

/**
 * @param {object} opcoes
 * @param {import('./repositorios/contrato.mjs').Repositorio} opcoes.repositorio
 * @param {() => Promise<string>} [opcoes.lerCatalogo] Devolve o texto do CATALOGO.md.
 * @param {string[]} [opcoes.origens] Origens que o CORS aceita (o endereço do painel).
 * @param {() => Date} [opcoes.relogio]
 * @param {ReturnType<typeof criarLog>} [opcoes.log] Log estruturado (T5.10).
 * @param {number} [opcoes.segundosDoCache] Tempo de vida do cache do catálogo (T5.7).
 * @param {ReturnType<typeof criarClienteDoGitHub>} [opcoes.github] Cliente da API do GitHub (T5.4).
 * @param {number} [opcoes.limitePorMinuto] Pedidos por minuto por endereço (T5.5).
 * @param {ReturnType<typeof configDoAmbiente>} [opcoes.configDoLogin] OAuth do GitHub e mantenedores (T5.13, T5.14).
 * @param {typeof fetch} [opcoes.buscarNoGitHub] fetch do login (simulado nos testes).
 */
export function criarApp({
  repositorio,
  lerCatalogo = leitorDeArquivo(),
  origens = [],
  relogio = () => new Date(),
  log = criarLog(),
  segundosDoCache = tempoDoCache(),
  github = criarClienteDoGitHub({ token: process.env.GITHUB_TOKEN || undefined }),
  limitePorMinuto = limiteDoAmbiente(),
  configDoLogin = configDoAmbiente(),
  buscarNoGitHub = fetch,
}) {
  conferirRepositorio(repositorio);
  const app = express();
  app.disable('x-powered-by');
  // O ETag é nosso (cache.mjs), forte e só nas rotas de leitura.
  app.set('etag', false);
  app.use(registrarPedidos(log));
  app.use(helmet());
  app.use(cors(origens));
  app.use(express.json({ limit: '10kb' }));
  const sessoes = criarSessoes({ agora: () => relogio().getTime() });
  app.locals.sessoes = sessoes;
  app.use(lerSessao(sessoes));

  // T5.7: o texto do catálogo fica em cache pelo tempo de vida.
  // A cada leitura nova, as trilhas e os itens vão também para o repositório (T6.6).
  const catalogo = emCache(
    async () => {
      const texto = await lerCatalogo();
      const lidas = trilhasDoTexto(texto);
      await repositorio.gravarCatalogo(lidas);
      return { texto, trilhas: lidas };
    },
    { segundos: segundosDoCache, agora: () => relogio().getTime() },
  );
  const trilhas = async () => (await catalogo()).trilhas;
  app.locals.limparCache = catalogo.limpar;

  const v1 = express.Router();
  // T5.3: toda rota passa por aqui e fica listada em app.locals.rotas; um teste
  // confere que cada uma está no api/openapi.json.
  const rotas = [];
  const rota = (metodo, caminho, ...funcoes) => {
    rotas.push({ metodo, caminho: `/v1${caminho}` });
    v1[metodo](caminho, ...funcoes);
  };
  app.locals.rotas = rotas;

  // /health lê o repositório: um /health que não toca os dados não prova a conexão.
  rota('get', '/health', async (_pedido, resposta) => {
    try {
      const { conclusoes } = await repositorio.saude();
      resposta.json({ situacao: 'ok', repositorio: { situacao: 'ok', conclusoes } });
    } catch {
      throw new ErroDaApi('indisponivel', 'O repositório de dados não respondeu.', { situacao: 'falha', repositorio: { situacao: 'falha' } });
    }
  });

  rota('get', '/catalogo', async (pedido, resposta) => {
    const conclusoes = await repositorio.listarConclusoes();
    jsonComEtag(pedido, resposta, { trilhas: comConclusoes(await trilhas(), conclusoes) });
  });

  // T5.2: registrar uma conclusão. 201 na primeira vez; 200 se já existia (T6.5).
  // T5.14: só mantenedor registra uma conclusão manual; a checagem é aqui, no servidor.
  rota('post', '/conclusoes', exigirPapel('mantenedor'), async (pedido, resposta) => {
    const dados = validar(esquemaDaConclusao, pedido.body);
    if (!itemExiste(await trilhas(), dados.item)) {
      throw new ErroDaApi('nao-encontrado', `O item ${dados.item} não existe no catálogo.`);
    }
    const { conclusao, criada } = await repositorio.registrarConclusao({ ...dados, concluidaEm: relogio().toISOString() });
    resposta.status(criada ? 201 : 200).json(conclusao);
  });

  rotasDeAutenticacao({ rota, sessoes, config: configDoLogin, buscar: buscarNoGitHub });
  rotasDeItens({ rota, trilhas, repositorio });
  rotaDoCsv({ rota, trilhas, repositorio });
  rotasDeProgresso({ rota, trilhas, repositorio });

  // T5.4: lê os PRs mesclados na main e grava quem fez cada item.
  rota('post', '/sincronizar', async (_pedido, resposta) => {
    const codigos = new Set((await trilhas()).flatMap((t) => t.itens.map((i) => i.codigo)));
    resposta.json(await sincronizar({ github, repositorio, existe: (c) => codigos.has(c) }));
  });

  // T5.15: rota antiga, mantida até a data de remoção, com os cabeçalhos de aviso.
  rota('get', '/catalogo.md', obsoleta(OBSOLETAS['/v1/catalogo.md']), async (_pedido, resposta) => {
    resposta.type('text/markdown; charset=utf-8').send((await catalogo()).texto);
  });

  app.use('/v1', limitarPedidos({ porMinuto: limitePorMinuto, agora: () => relogio().getTime() }), v1);
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
      resposta.set('Access-Control-Expose-Headers', 'X-Request-Id, ETag');
      // O painel manda o cookie da sessão (fetch com credentials: "include").
      resposta.set('Access-Control-Allow-Credentials', 'true');
    }
    if (pedido.method === 'OPTIONS') return resposta.sendStatus(204);
    seguir();
  };
}
