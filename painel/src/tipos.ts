// T3.4: tipos dos dados do catálogo, usados em todo o painel.

/** Um item do catálogo, como "T2.3". */
export interface Item {
  codigo: string;
  texto: string;
  feito: boolean;
}

/** Link de uma trilha para o roadmap.sh. */
export interface Roadmap {
  nome: string;
  url: string;
}

/** Uma trilha do catálogo, como "T2 · Frontend base". */
export interface Trilha {
  codigo: string;
  nome: string;
  roadmaps: Roadmap[];
  itens: Item[];
}

export interface Progresso {
  feitos: number;
  total: number;
  /** De 0 a 100, arredondado para baixo. */
  percentual: number;
}

export type Situacao = 'todos' | 'feitos' | 'a-fazer';

export interface Filtro {
  /** Código da trilha; vazio quer dizer todas. */
  trilha?: string;
  situacao?: Situacao;
}

/** Pedaço do texto de um item: texto comum ou código (entre crases). */
export interface Pedaco {
  codigo: boolean;
  texto: string;
}
