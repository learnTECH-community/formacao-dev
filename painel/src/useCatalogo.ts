// Busca o CATALOGO.md e devolve o estado da busca: carregando, erro, vazio ou pronto.
// T3.5: cada estado tem resposta na tela. O pedido é cancelado se o componente sair da página.
import { useCallback, useEffect, useState } from 'react';
import { lerCatalogo } from './catalogo';
import type { Trilha } from './tipos';

export type EstadoDoCatalogo =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; erro: unknown }
  | { situacao: 'vazio' }
  | { situacao: 'pronto'; trilhas: Trilha[] };

export type Catalogo = EstadoDoCatalogo & { tentarDeNovo: () => void };

/** Endereço do catálogo, ao lado do index.html no build. */
export const ENDERECO_DO_CATALOGO = 'CATALOGO.md';

/** Busca e lê o catálogo. Sem item nenhum, devolve "vazio". */
export async function buscarCatalogo(endereco: string, sinal?: AbortSignal): Promise<EstadoDoCatalogo> {
  const resposta = await fetch(endereco, { cache: 'no-cache', signal: sinal });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  const trilhas = lerCatalogo(await resposta.text());
  if (trilhas.flatMap((t) => t.itens).length === 0) return { situacao: 'vazio' };
  return { situacao: 'pronto', trilhas };
}

/** Mensagem curta para a pessoa, sem detalhe técnico demais. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof TypeError) return 'Não conseguimos falar com o servidor. Confira a conexão.';
  const detalhe = erro instanceof Error ? erro.message : String(erro);
  return `O servidor respondeu com erro (${detalhe}).`;
}

export function useCatalogo(endereco: string = ENDERECO_DO_CATALOGO): Catalogo {
  const [estado, setEstado] = useState<EstadoDoCatalogo>({ situacao: 'carregando' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    buscarCatalogo(endereco, controle.signal).then(
      (novo) => setEstado(novo),
      (erro: unknown) => {
        if (!controle.signal.aborted) setEstado({ situacao: 'erro', erro });
      },
    );
    return () => controle.abort();
  }, [endereco, tentativa]);

  const tentarDeNovo = useCallback(() => {
    setEstado({ situacao: 'carregando' });
    setTentativa((n) => n + 1);
  }, []);

  return { ...estado, tentarDeNovo };
}
