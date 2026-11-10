// T9.9: métricas da API no formato de texto do Prometheus, sem dependência.
//   api_pedidos_total{metodo, rota, status}       contador de pedidos
//   api_duracao_segundos{metodo, rota}            histograma da latência
// A rota é o modelo ("/v1/itens/:codigo"), nunca o caminho com valores, a query ou
// quem pediu: nenhuma métrica carrega dado pessoal (o mesmo cuidado do log, T5.10).
// GET /metricas só existe com METRICAS=sim; no compose, o Prometheus a lê pela rede
// interna, e o Nginx não a repassa.

/** Limites do histograma, em segundos. */
export const LIMITES = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

export const metricasDoAmbiente = (valor = process.env.METRICAS) => ['sim', '1', 'true'].includes(String(valor ?? '').toLowerCase());

/** Aspas, barra e quebra de linha escapadas, como o formato pede. */
const escapar = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
const rotulos = (r) =>
  `{${Object.entries(r)
    .map(([k, v]) => `${k}="${escapar(v)}"`)
    .join(',')}}`;

/**
 * O Express volta o baseUrl a "" quando um erro sai do roteador /v1 (um 404 de item, por
 * exemplo). Nesse caso, o prefixo vem do começo do caminho pedido.
 */
const prefixo = (pedido) => pedido.baseUrl || (pedido.originalUrl.startsWith('/v1/') ? '/v1' : '');

export function criarMetricas({ agora = () => performance.now() } = {}) {
  /** @type {Map<string, { rotulos: object, n: number }>} */
  const pedidos = new Map();
  /** @type {Map<string, { rotulos: object, baldes: number[], soma: number, n: number }>} */
  const duracoes = new Map();

  function registrar({ metodo, rota, status, segundos }) {
    const chave = `${metodo} ${rota} ${status}`;
    const p = pedidos.get(chave) ?? { rotulos: { metodo, rota, status: String(status) }, n: 0 };
    p.n++;
    pedidos.set(chave, p);
    const chaveD = `${metodo} ${rota}`;
    const d = duracoes.get(chaveD) ?? { rotulos: { metodo, rota }, baldes: LIMITES.map(() => 0), soma: 0, n: 0 };
    LIMITES.forEach((limite, i) => {
      if (segundos <= limite) d.baldes[i]++;
    });
    d.soma += segundos;
    d.n++;
    duracoes.set(chaveD, d);
  }

  /** Middleware: mede cada pedido ao terminar. */
  function middleware(pedido, resposta, seguir) {
    const inicio = agora();
    resposta.on('finish', () => {
      // Sem rota casada (404), o rótulo é fixo: um caminho inventado não cria série nova.
      const rota = pedido.route ? `${prefixo(pedido)}${pedido.route.path}` : '(sem rota)';
      registrar({ metodo: pedido.method, rota, status: resposta.statusCode, segundos: (agora() - inicio) / 1000 });
    });
    seguir();
  }

  /** O texto do formato de exposição do Prometheus (versão 0.0.4). */
  function texto() {
    const linhas = ['# HELP api_pedidos_total Pedidos atendidos, por método, rota e status.', '# TYPE api_pedidos_total counter'];
    for (const p of pedidos.values()) linhas.push(`api_pedidos_total${rotulos(p.rotulos)} ${p.n}`);
    linhas.push('# HELP api_duracao_segundos Tempo de resposta, por método e rota.', '# TYPE api_duracao_segundos histogram');
    for (const d of duracoes.values()) {
      LIMITES.forEach((limite, i) => linhas.push(`api_duracao_segundos_bucket${rotulos({ ...d.rotulos, le: String(limite) })} ${d.baldes[i]}`));
      linhas.push(`api_duracao_segundos_bucket${rotulos({ ...d.rotulos, le: '+Inf' })} ${d.n}`);
      linhas.push(`api_duracao_segundos_sum${rotulos(d.rotulos)} ${Number(d.soma.toFixed(6))}`);
      linhas.push(`api_duracao_segundos_count${rotulos(d.rotulos)} ${d.n}`);
    }
    return `${linhas.join('\n')}\n`;
  }

  /** Rota GET /metricas. */
  function rota(_pedido, resposta) {
    resposta.set('Cache-Control', 'no-store').type('text/plain; version=0.0.4; charset=utf-8').send(texto());
  }

  return { middleware, rota, texto, registrar };
}
