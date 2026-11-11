// T10.14: tempos limite do servidor HTTP. Um cliente lento (que manda os cabeçalhos
// ou o corpo aos poucos) não segura a conexão para sempre: depois do limite, o Node
// responde 408 e fecha. A rota de eventos (/v1/eventos) não é afetada: o limite vale
// para receber o pedido, não para a resposta, que fica aberta.
//
// Variáveis (nomes no api/.env.example):
//   TEMPO_DO_PEDIDO_EM_MS   tempo para receber o pedido inteiro (padrão 15000)
//   TEMPO_DOS_CABECALHOS_EM_MS tempo para receber os cabeçalhos (padrão 10000)

const numero = (valor, padrao) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : padrao;
};

/** Opções para http.createServer. */
export function opcoesDoServidor(ambiente = process.env) {
  const requestTimeout = numero(ambiente.TEMPO_DO_PEDIDO_EM_MS, 15_000);
  // Os cabeçalhos chegam antes do corpo: o limite deles não passa do limite do pedido.
  const headersTimeout = Math.min(numero(ambiente.TEMPO_DOS_CABECALHOS_EM_MS, 10_000), requestTimeout);
  return {
    requestTimeout,
    headersTimeout,
    // Conexão parada entre dois pedidos fecha em 5 s.
    keepAliveTimeout: 5_000,
    // Cabeçalhos acima de 16 KB recebem 431.
    maxHeaderSize: 16 * 1024,
  };
}
