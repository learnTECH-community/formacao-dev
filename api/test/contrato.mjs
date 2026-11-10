// T7.8: confere uma resposta real contra o api/openapi.json.
// O esquema de cada resposta sai da especificação (status e tipo de conteúdo),
// e o Ajv valida o corpo. Resposta sem esquema na especificação também falha.
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const especificacao = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema({ $id: 'openapi', components: especificacao.components });

const validadores = new Map();
function validadorDe(ref) {
  if (!validadores.has(ref)) validadores.set(ref, ajv.compile({ $ref: `openapi${ref}` }));
  return validadores.get(ref);
}

/** Acha o caminho da especificação que casa com o caminho pedido ("/v1/itens/T2.3" → "/v1/itens/{codigo}"). */
export function caminhoDaEspecificacao(caminho) {
  const semConsulta = caminho.split('?')[0];
  return Object.keys(especificacao.paths).find((modelo) => {
    const regex = new RegExp(`^${modelo.replace(/[.]/g, '\\.').replace(/\{\w+\}/g, '[^/]+')}$`);
    return regex.test(semConsulta);
  });
}

/**
 * Valida a resposta. Devolve a lista de problemas (vazia se cumpre o contrato).
 * @param {{ metodo: string, caminho: string, status: number, tipo: string | null, corpo: unknown }} resposta
 */
export function problemasDoContrato({ metodo, caminho, status, tipo, corpo }) {
  const modelo = caminhoDaEspecificacao(caminho);
  if (!modelo) return [`${caminho} não está na especificação`];
  const operacao = especificacao.paths[modelo][metodo.toLowerCase()];
  if (!operacao) return [`${metodo} ${modelo} não está na especificação`];
  let declarada = operacao.responses[String(status)];
  if (!declarada) return [`${metodo} ${modelo} não declara a resposta ${status}`];
  if (declarada.$ref) declarada = especificacao.components.responses[declarada.$ref.split('/').at(-1)];
  // 204 e 304 não têm corpo pela HTTP; num redirecionamento (3xx), o corpo é só um texto de cortesia.
  if (!declarada.content) return [204, 304].includes(status) && corpo !== undefined && corpo !== '' ? [`${status} não deveria ter corpo`] : [];
  const midia = (tipo ?? '').split(';')[0].trim();
  const conteudo = declarada.content[midia];
  if (!conteudo) return [`${metodo} ${modelo} ${status}: tipo ${midia || '(nenhum)'} fora da especificação`];
  if (!conteudo.schema?.$ref) return [];
  const validar = validadorDe(conteudo.schema.$ref);
  if (validar(corpo)) return [];
  return validar.errors.map((e) => `${metodo} ${modelo} ${status}: ${e.instancePath || '(raiz)'} ${e.message}`);
}

/** fetch que já lê o corpo e confere o contrato. */
export async function pedirComContrato(base, caminho, opcoes = {}) {
  const resposta = await fetch(`${base}${caminho}`, opcoes);
  const tipo = resposta.headers.get('content-type');
  const texto = await resposta.text();
  const corpo = /json/.test(tipo ?? '') ? JSON.parse(texto) : texto;
  const metodo = opcoes.method ?? 'GET';
  return {
    status: resposta.status,
    corpo,
    cabecalhos: resposta.headers,
    problemas: problemasDoContrato({ metodo, caminho, status: resposta.status, tipo, corpo }),
    operacao: `${metodo.toLowerCase()} ${caminhoDaEspecificacao(caminho)}`,
  };
}
