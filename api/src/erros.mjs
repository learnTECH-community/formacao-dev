// T5.9: erros num middleware central, no formato Problem Details (RFC 9457).
// Toda resposta de erro sai com type, title, status e detail, em
// application/problem+json. Erro inesperado vira 500 sem a pilha na resposta.

const DOC = 'https://github.com/learnTECH-community/formacao-dev/blob/main/docs/api.md';

/** Tipos de problema da API: o "type" aponta para a explicação em docs/api.md. */
export const PROBLEMAS = {
  validacao: { status: 400, title: 'Entrada inválida' },
  'json-malformado': { status: 400, title: 'JSON malformado' },
  'corpo-grande': { status: 413, title: 'Corpo grande demais' },
  'nao-autenticado': { status: 401, title: 'Sessão necessária' },
  proibido: { status: 403, title: 'Sem permissão' },
  'nao-encontrado': { status: 404, title: 'Não encontrado' },
  'limite-de-pedidos': { status: 429, title: 'Pedidos demais' },
  'falha-do-github': { status: 502, title: 'Falha ao falar com o GitHub' },
  'github-indisponivel': { status: 503, title: 'GitHub indisponível por agora' },
  indisponivel: { status: 503, title: 'Serviço indisponível' },
  interno: { status: 500, title: 'Erro interno' },
};

/** Erro que as rotas lançam. O middleware central o transforma na resposta. */
export class ErroDaApi extends Error {
  /**
   * @param {keyof typeof PROBLEMAS} tipo
   * @param {string} detail Explicação para quem chama a API, em português.
   * @param {object} [extras] Campos a mais do problema (como "erros") e cabeçalhos.
   */
  constructor(tipo, detail, { cabecalhos = {}, ...extras } = {}) {
    super(detail);
    this.tipo = tipo;
    this.extras = extras;
    this.cabecalhos = cabecalhos;
  }
}

/** Monta o corpo do problema. */
export function problema(tipo, detail, extras = {}) {
  const { status, title } = PROBLEMAS[tipo];
  return { type: `${DOC}#${tipo}`, title, status, detail, ...extras };
}

/**
 * JSON seguro para devolver texto do usuário (como o caminho pedido): troca <, > e &
 * pelo escape Unicode (<, >, &). O JSON continua o mesmo para quem o lê, mas, se um navegador
 * o mostrar como HTML, não há tag para executar (XSS refletido).
 */
export function jsonSeguro(valor) {
  return JSON.stringify(valor).replace(/[<>&]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function responder(resposta, tipo, detail, extras = {}, cabecalhos = {}) {
  const corpo = problema(tipo, detail, extras);
  resposta.status(corpo.status).set(cabecalhos).type('application/problem+json').send(jsonSeguro(corpo));
}

/** Rota que não existe: 404 no mesmo formato. */
export function rotaNaoEncontrada(pedido, resposta) {
  responder(resposta, 'nao-encontrado', `A rota ${pedido.method} ${pedido.path} não existe.`, { instance: pedido.path });
}

/**
 * Middleware de erro: o último do app. No Express 5, erro lançado em função
 * assíncrona (promessa rejeitada) também chega aqui.
 * @param {{ error: (dados: object) => void }} log
 */
export function tratarErros(log) {
  // O Express reconhece o middleware de erro pelos quatro parâmetros.
  return (erro, pedido, resposta, _seguir) => {
    // Erro no meio de uma resposta já começada (um stream): não dá para mandar outro
    // cabeçalho; registra e corta a conexão, para o cliente saber que veio incompleta.
    if (resposta.headersSent) {
      log.error({ msg: 'erro depois do início da resposta', id: pedido.id, rota: pedido.path, erro: erro?.message });
      return resposta.destroy();
    }
    if (erro instanceof ErroDaApi) {
      return responder(resposta, erro.tipo, erro.message, { instance: pedido.path, ...erro.extras }, erro.cabecalhos);
    }
    if (erro?.type === 'entity.parse.failed') {
      return responder(resposta, 'json-malformado', 'O corpo do pedido não é um JSON válido.', { instance: pedido.path });
    }
    if (erro?.type === 'entity.too.large') {
      return responder(resposta, 'corpo-grande', 'O corpo do pedido passa de 10 KB.', { instance: pedido.path });
    }
    // Inesperado: a pilha vai para o log do servidor, nunca para a resposta.
    log.error({ msg: 'erro inesperado', id: pedido.id, rota: pedido.path, erro: erro?.message, pilha: erro?.stack });
    responder(resposta, 'interno', 'Algo falhou do nosso lado. Tente de novo mais tarde.', { instance: pedido.path });
  };
}
