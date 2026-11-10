// T5.8: avisos em tempo real com Server-Sent Events (SSE).
// GET /v1/eventos mantém a conexão aberta (text/event-stream). Quando uma
// conclusão nova é gravada, todo painel aberto recebe "event: conclusao".
// "retry" diz ao navegador quanto esperar para reconectar se a conexão cair;
// um comentário a cada 25 s mantém a conexão viva em proxies que cortam conexão parada.

export const ESPERA_PARA_RECONECTAR_MS = 3000;
const BATIDA_MS = 25_000;

export function criarCanalDeEventos({ batidaMs = BATIDA_MS } = {}) {
  /** @type {Set<import('express').Response>} */
  const ouvintes = new Set();
  let proximoId = 1;

  return {
    get ouvintes() {
      return ouvintes.size;
    },
    /** Avisa todo mundo. O id permite ao navegador mandar Last-Event-ID ao reconectar. */
    enviar(evento, dados) {
      const mensagem = `id: ${proximoId++}\nevent: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`;
      for (const resposta of ouvintes) resposta.write(mensagem);
    },
    /** Rota GET /v1/eventos. */
    rota(pedido, resposta) {
      resposta.status(200);
      resposta.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // Proxies como o nginx guardam a resposta em buffer; isto pede que não.
        'X-Accel-Buffering': 'no',
      });
      resposta.flushHeaders();
      resposta.write(`retry: ${ESPERA_PARA_RECONECTAR_MS}\n: conectado\n\n`);
      ouvintes.add(resposta);
      const batida = setInterval(() => resposta.write(': batida\n\n'), batidaMs);
      batida.unref();
      pedido.on('close', () => {
        clearInterval(batida);
        ouvintes.delete(resposta);
      });
    },
    /** Fecha todas as conexões (ao desligar o servidor). */
    fechar() {
      for (const resposta of ouvintes) resposta.end();
      ouvintes.clear();
    },
  };
}
