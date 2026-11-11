// T5.5: limite de pedidos por minuto para cada endereço (janela fixa de 60 s).
// O limite vem de LIMITE_POR_MINUTO (padrão 60). Acima dele, 429 com Retry-After.
// Fica em memória: com vários servidores, cada um conta o seu (ver "Fora" na #211).
import { ErroDaApi } from './erros.mjs';

export const LIMITE_PADRAO_POR_MINUTO = 60;
const JANELA_MS = 60_000;

export function limiteDoAmbiente(valor = process.env.LIMITE_POR_MINUTO) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : LIMITE_PADRAO_POR_MINUTO;
}

/**
 * @param {{ porMinuto: number, agora?: () => number }} opcoes
 */
export function limitarPedidos({ porMinuto, agora = Date.now }) {
  /** @type {Map<string, { inicio: number, pedidos: number }>} */
  const janelas = new Map();
  return (pedido, resposta, seguir) => {
    const hora = agora();
    // Limpa janelas vencidas para o mapa não crescer sem fim.
    if (janelas.size > 10_000) for (const [k, j] of janelas) if (hora - j.inicio >= JANELA_MS) janelas.delete(k);
    const chave = pedido.ip ?? 'desconhecido';
    let janela = janelas.get(chave);
    if (!janela || hora - janela.inicio >= JANELA_MS) {
      janela = { inicio: hora, pedidos: 0 };
      janelas.set(chave, janela);
    }
    janela.pedidos++;
    const restam = Math.max(0, porMinuto - janela.pedidos);
    const segundos = Math.max(1, Math.ceil((janela.inicio + JANELA_MS - hora) / 1000));
    resposta.set('RateLimit-Limit', String(porMinuto));
    resposta.set('RateLimit-Remaining', String(restam));
    resposta.set('RateLimit-Reset', String(segundos));
    if (janela.pedidos > porMinuto) {
      return seguir(
        new ErroDaApi('limite-de-pedidos', `Mais de ${porMinuto} pedidos por minuto. Tente de novo em ${segundos} s.`, {
          cabecalhos: { 'Retry-After': String(segundos) },
        }),
      );
    }
    seguir();
  };
}
