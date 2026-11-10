// T5.10: logs estruturados em JSON, uma linha por evento, com um id por pedido.
// Nível pela variável NIVEL_DO_LOG (debug, info, warn, error; padrão info).
// Nada de dado pessoal ou token: o log do pedido guarda o modelo da rota
// ("/v1/itens/:codigo"), nunca a query, o corpo ou os cabeçalhos.
import { randomUUID } from 'node:crypto';

export const NIVEIS = ['debug', 'info', 'warn', 'error'];

// Campos que nunca vão para o log, em qualquer profundidade.
const PROIBIDOS = /^(authorization|cookie|set-cookie|token|senha|password|segredo|secret|usuario|email)$/i;

/** Copia os dados trocando os campos proibidos por "[omitido]". */
export function semDadosSensiveis(dados) {
  if (Array.isArray(dados)) return dados.map(semDadosSensiveis);
  if (!dados || typeof dados !== 'object') return dados;
  return Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, PROIBIDOS.test(k) ? '[omitido]' : semDadosSensiveis(v)]));
}

/**
 * @param {object} [opcoes]
 * @param {string} [opcoes.nivel] Nível mínimo registrado.
 * @param {(linha: string) => void} [opcoes.escrever]
 * @param {() => Date} [opcoes.relogio]
 */
export function criarLog({ nivel = process.env.NIVEL_DO_LOG ?? 'info', escrever = (l) => process.stdout.write(`${l}\n`), relogio = () => new Date() } = {}) {
  const minimo = NIVEIS.indexOf(nivel);
  if (minimo < 0) throw new Error(`NIVEL_DO_LOG inválido: ${nivel}. Use ${NIVEIS.join(', ')}.`);
  const registrar = (n) => (dados) => {
    if (NIVEIS.indexOf(n) < minimo) return;
    escrever(JSON.stringify({ hora: relogio().toISOString(), nivel: n, ...semDadosSensiveis(dados) }));
  };
  return Object.fromEntries(NIVEIS.map((n) => [n, registrar(n)]));
}

// Id que chega do cliente ou do proxy só é aceito se for curto e sem caracteres estranhos.
const ID_ACEITO = /^[A-Za-z0-9_-]{8,64}$/;

/** Middleware: id do pedido no cabeçalho X-Request-Id e uma linha de log ao terminar. */
export function registrarPedidos(log, { gerarId = randomUUID, agora = () => performance.now() } = {}) {
  return (pedido, resposta, seguir) => {
    const recebido = pedido.get('x-request-id');
    const id = recebido && ID_ACEITO.test(recebido) ? recebido : gerarId();
    pedido.id = id;
    resposta.set('X-Request-Id', id);
    const inicio = agora();
    resposta.on('finish', () => {
      const rota = pedido.route ? `${pedido.baseUrl}${pedido.route.path}` : '(sem rota)';
      const status = resposta.statusCode;
      const dados = { msg: 'pedido', id, metodo: pedido.method, rota, status, ms: Math.round((agora() - inicio) * 10) / 10 };
      (status >= 500 ? log.error : status >= 400 ? log.warn : log.info)(dados);
    });
    seguir();
  };
}
