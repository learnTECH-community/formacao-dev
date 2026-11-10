// T4.8: dois contextos: o estado e as ações. Quem só despacha ações não
// renderiza de novo quando o estado muda.
import { createContext, type Dispatch } from 'react';
import type { Acao, Preferencias } from './preferencias';

export const EstadoContexto = createContext<Preferencias | null>(null);
export const AcoesContexto = createContext<Dispatch<Acao> | null>(null);
