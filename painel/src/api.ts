// Cliente HTTP único do painel para a API (trilhas T5 e T6).
// A URL base vem de VITE_API_URL, definida no build. Sem ela, o painel funciona
// como antes: lê o CATALOGO.md e não abre avisos em tempo real.
import type { Trilha } from './tipos';

/** URL base da API, sem a barra do fim; undefined se a API não está configurada. */
export function urlDaApi(): string | undefined {
  const valor = import.meta.env.VITE_API_URL;
  return valor ? valor.replace(/\/+$/, '') : undefined;
}

/** Endereço completo de uma rota da API, como "/v1/catalogo". */
export function enderecoNaApi(caminho: string, base = urlDaApi()): string {
  if (!base) throw new Error('VITE_API_URL não está definida');
  return `${base}${caminho}`;
}

/** Erro de uma resposta da API (Problem Details, RFC 9457). */
export class ErroDaApi extends Error {
  constructor(
    readonly status: number,
    readonly titulo: string,
  ) {
    super(`HTTP ${status}`);
  }
}

/** GET de JSON na API. Manda o cookie da sessão (credentials: "include"). */
export async function pedirNaApi<T>(caminho: string, { sinal, base }: { sinal?: AbortSignal; base?: string } = {}): Promise<T> {
  const resposta = await fetch(enderecoNaApi(caminho, base ?? urlDaApi()), {
    headers: { Accept: 'application/json' },
    credentials: 'include',
    signal: sinal,
  });
  if (!resposta.ok) {
    let titulo = '';
    try {
      titulo = ((await resposta.json()) as { title?: string }).title ?? '';
    } catch {
      // corpo sem JSON: fica só o código
    }
    throw new ErroDaApi(resposta.status, titulo);
  }
  return (await resposta.json()) as T;
}

/** Forma do item em GET /v1/catalogo. */
interface ItemDaApi {
  codigo: string;
  texto: string;
  feito: boolean;
  issue?: number;
}

export interface CatalogoDaApi {
  trilhas: (Omit<Trilha, 'itens'> & { itens: ItemDaApi[] })[];
}

/** Converte a resposta da API para os tipos do painel. O "(#N)" volta ao texto, como no CATALOGO.md. */
export function trilhasDaApi({ trilhas }: CatalogoDaApi): Trilha[] {
  return trilhas.map((t) => ({
    codigo: t.codigo,
    nome: t.nome,
    roadmaps: t.roadmaps,
    itens: t.itens.map((i) => ({ codigo: i.codigo, texto: i.issue ? `${i.texto} (#${i.issue})` : i.texto, feito: i.feito })),
  }));
}
