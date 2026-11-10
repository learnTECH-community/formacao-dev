// T4.3: endereços das páginas do painel.
import type { EstadoDoCatalogo } from './useCatalogo';

/** Endereço da página de detalhe da trilha. */
export function enderecoDaTrilha(codigo: string): string {
  return `/trilha/${codigo}`;
}

/** O que toda página recebe do App. */
export interface PropsDePagina {
  catalogo: EstadoDoCatalogo;
  /** Aumenta quando o catálogo chega depois de "Tentar de novo": a página leva o foco ao título. */
  pedidoDeFoco: number;
}
