// T4.8: um provedor só, no topo do app, com o tema e os itens fixados.
// Os efeitos aplicam o tema na página e guardam as escolhas no localStorage.
import { useEffect, useReducer, type ReactNode } from 'react';
import { guardar, lerGuardado } from '../armazenamento';
import { aplicarTema, guardarTema, ouvirTemaDoSistema, temaDoSistema, temaGuardado } from '../tema';
import { AcoesContexto, EstadoContexto } from './contextos';
import { CHAVE_FIXADOS, lerFixados, preferenciasReducer, type Preferencias } from './preferencias';

function inicial(): Preferencias {
  return {
    temaEscolhido: temaGuardado(),
    temaDoSistema: temaDoSistema(),
    fixados: lerFixados(lerGuardado(CHAVE_FIXADOS)),
  };
}

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(preferenciasReducer, undefined, inicial);

  useEffect(
    () => ouvirTemaDoSistema(() => despachar({ tipo: 'tema-do-sistema-mudou', tema: temaDoSistema() })),
    [],
  );

  useEffect(() => {
    if (!estado.temaEscolhido) return; // sem escolha, a página segue o sistema pelo CSS
    aplicarTema(estado.temaEscolhido);
    guardarTema(estado.temaEscolhido);
  }, [estado.temaEscolhido]);

  useEffect(() => {
    guardar(CHAVE_FIXADOS, JSON.stringify(estado.fixados));
  }, [estado.fixados]);

  return (
    <EstadoContexto value={estado}>
      <AcoesContexto value={despachar}>{children}</AcoesContexto>
    </EstadoContexto>
  );
}
