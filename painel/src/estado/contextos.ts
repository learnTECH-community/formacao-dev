// T4.8: dois contextos: o estado e as ações. Quem só despacha ações não
// renderiza de novo quando o estado muda.
import { createContext, type Dispatch } from 'react';
import type { Acao, Preferencias } from './preferencias';

export const EstadoContexto = createContext<Preferencias | null>(null);
/**
 * T4.5: os fixados em contexto próprio. Trocar o tema não muda esta lista (o reducer
 * devolve o mesmo array), e quem só lê os fixados não renderiza de novo.
 */
export const FixadosContexto = createContext<readonly string[] | null>(null);
export const AcoesContexto = createContext<Dispatch<Acao> | null>(null);
