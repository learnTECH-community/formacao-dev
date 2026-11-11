// T5.7: cache do catálogo em memória, com tempo de vida, e respostas com ETag.
// O CATALOGO.md é lido do disco no máximo uma vez por tempo de vida
// (TEMPO_DO_CACHE_EM_SEGUNDOS, padrão 60). A resposta leva um ETag forte
// (hash do corpo) e Cache-Control: no-cache, que manda o navegador perguntar
// sempre; se nada mudou, a API responde 304 sem corpo.
import { createHash } from 'node:crypto';

export const TEMPO_PADRAO_EM_SEGUNDOS = 60;

/** Lê o tempo de vida da variável de ambiente; valor inválido cai no padrão. */
export function tempoDoCache(valor = process.env.TEMPO_DO_CACHE_EM_SEGUNDOS) {
  const segundos = Number(valor);
  return Number.isFinite(segundos) && segundos >= 0 && valor !== undefined && valor !== '' ? segundos : TEMPO_PADRAO_EM_SEGUNDOS;
}

/**
 * Guarda o resultado de uma função assíncrona por um tempo de vida.
 * Pedidos simultâneos com o cache vencido esperam a mesma leitura.
 * @template T
 * @param {() => Promise<T>} carregar
 * @param {{ segundos: number, agora?: () => number }} opcoes
 */
export function emCache(carregar, { segundos, agora = Date.now }) {
  let valor;
  let venceEm = -Infinity;
  let emAndamento = null;
  const obter = async () => {
    if (agora() < venceEm) return valor;
    emAndamento ??= carregar()
      .then((novo) => {
        valor = novo;
        venceEm = agora() + segundos * 1000;
        return novo;
      })
      .finally(() => {
        emAndamento = null;
      });
    return emAndamento;
  };
  obter.limpar = () => {
    venceEm = -Infinity;
  };
  return obter;
}

/** ETag forte: hash do corpo, entre aspas. */
export function etagDe(corpo) {
  return `"${createHash('sha256').update(corpo).digest('base64url').slice(0, 27)}"`;
}

/** If-None-Match pode trazer vários ETags, ou "*". Comparação fraca, como pede a RFC 9110 para GET. */
export function casaComEtag(cabecalho, etag) {
  if (!cabecalho) return false;
  if (cabecalho.trim() === '*') return true;
  const semFraco = (e) => e.trim().replace(/^W\//, '');
  return cabecalho.split(',').some((e) => semFraco(e) === semFraco(etag));
}

/** Responde JSON com ETag e Cache-Control; 304 sem corpo se o cliente já tem a versão. */
export function jsonComEtag(pedido, resposta, dados) {
  const corpo = JSON.stringify(dados);
  const etag = etagDe(corpo);
  resposta.set('ETag', etag);
  resposta.set('Cache-Control', 'no-cache');
  if (casaComEtag(pedido.get('if-none-match'), etag)) return resposta.status(304).end();
  resposta.type('application/json').send(corpo);
}
