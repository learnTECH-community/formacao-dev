// T4.8: preferências da pessoa (tema e itens fixados) num reducer com ações tipadas.
// Funções puras: o reducer e a leitura do que foi guardado têm testes de unidade.
import type { Tema } from '../tema';

export interface Preferencias {
  /** Tema escolhido pelo botão; null quer dizer "seguir o sistema". */
  temaEscolhido: Tema | null;
  temaDoSistema: Tema;
  /** Códigos dos itens fixados, na ordem em que foram fixados. */
  fixados: readonly string[];
}

export type Acao =
  | { tipo: 'trocar-tema' }
  | { tipo: 'tema-do-sistema-mudou'; tema: Tema }
  | { tipo: 'alternar-fixado'; codigo: string }
  | { tipo: 'limpar-fixados' };

/** O tema em uso: a escolha da pessoa ou, sem escolha, o do sistema. */
export function temaEmUso(p: Pick<Preferencias, 'temaEscolhido' | 'temaDoSistema'>): Tema {
  return p.temaEscolhido ?? p.temaDoSistema;
}

export function preferenciasReducer(estado: Preferencias, acao: Acao): Preferencias {
  switch (acao.tipo) {
    case 'trocar-tema':
      return { ...estado, temaEscolhido: temaEmUso(estado) === 'escuro' ? 'claro' : 'escuro' };
    case 'tema-do-sistema-mudou':
      return acao.tema === estado.temaDoSistema ? estado : { ...estado, temaDoSistema: acao.tema };
    case 'alternar-fixado':
      return {
        ...estado,
        fixados: estado.fixados.includes(acao.codigo)
          ? estado.fixados.filter((c) => c !== acao.codigo)
          : [...estado.fixados, acao.codigo],
      };
    case 'limpar-fixados':
      return estado.fixados.length === 0 ? estado : { ...estado, fixados: [] };
  }
}

export const CHAVE_FIXADOS = 'painel-fixados';
const CODIGO = /^T\d+\.\d+$/;

/**
 * Lê os fixados guardados. Texto que não é JSON, que não é lista ou com valores
 * estranhos não quebra o painel: o que não for código de item é descartado.
 */
export function lerFixados(texto: string | null): string[] {
  if (!texto) return [];
  try {
    const valor: unknown = JSON.parse(texto);
    if (!Array.isArray(valor)) return [];
    return [...new Set(valor.filter((c): c is string => typeof c === 'string' && CODIGO.test(c)))];
  } catch {
    return [];
  }
}
