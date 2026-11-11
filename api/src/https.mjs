// T10.10: só HTTPS. Na hospedagem (Render e parecidos), o TLS termina no proxy, que
// repassa o pedido em HTTP com o cabeçalho X-Forwarded-Proto. Com SO_HTTPS=sim, um
// pedido que chegou ao proxy em HTTP é redirecionado (308, mantém o método e o corpo)
// para o mesmo endereço em HTTPS. O HSTS (Strict-Transport-Security) vem do helmet,
// com 1 ano e os subdomínios: depois da primeira visita, o navegador nem tenta o HTTP.
//
// Localmente (sem SO_HTTPS), nada muda: a API roda em http://127.0.0.1.

/** SO_HTTPS=sim (ou 1, ou true) liga o redirecionamento. */
export const soHttpsDoAmbiente = (valor = process.env.SO_HTTPS) => ['sim', '1', 'true'].includes(String(valor ?? '').toLowerCase());

/** Opções do HSTS passadas ao helmet. */
export const HSTS = { maxAge: 31_536_000, includeSubDomains: true };

/** Middleware: com `ativo`, HTTP vira 308 para HTTPS. */
export function redirecionarParaHttps(ativo) {
  return (pedido, resposta, seguir) => {
    if (!ativo) return seguir();
    // Só o primeiro valor conta (o do proxy mais perto da pessoa).
    const protocolo = String(pedido.get('x-forwarded-proto') ?? '').split(',')[0].trim().toLowerCase();
    if (protocolo !== 'http') return seguir();
    const host = pedido.get('host');
    if (!host || !/^[A-Za-z0-9.-]+(:\d+)?$/.test(host)) return resposta.status(400).end();
    resposta.redirect(308, `https://${host}${pedido.originalUrl}`);
  };
}
