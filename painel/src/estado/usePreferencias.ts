// T4.8: leitura do estado compartilhado de preferências.
import { useContext, type Dispatch } from 'react';
import { AcoesContexto, EstadoContexto, FixadosContexto } from './contextos';
import type { Acao, Preferencias } from './preferencias';

export function usePreferencias(): Preferencias {
  const estado = useContext(EstadoContexto);
  if (!estado) throw new Error('usePreferencias precisa do PreferenciasProvider no topo do app');
  return estado;
}

export function useAcoesDePreferencias(): Dispatch<Acao> {
  const despachar = useContext(AcoesContexto);
  if (!despachar) throw new Error('useAcoesDePreferencias precisa do PreferenciasProvider no topo do app');
  return despachar;
}

/** Só os fixados: não renderiza de novo quando o tema muda (T4.5). */
export function useFixados(): readonly string[] {
  const fixados = useContext(FixadosContexto);
  if (!fixados) throw new Error('useFixados precisa do PreferenciasProvider no topo do app');
  return fixados;
}
