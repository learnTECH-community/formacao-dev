// T5.8: avisos em tempo real da API (Server-Sent Events).
// Com VITE_API_URL definida, o painel ouve /v1/eventos. A cada "conclusao", o catálogo
// é buscado de novo e a barra de progresso muda, sem recarregar a página.
// Reconexão: o EventSource reconecta sozinho depois de uma queda (a API manda
// "retry: 3000"). Se o navegador desistir (readyState CLOSED, como num erro HTTP),
// o hook abre outra conexão, esperando cada vez mais (1 s, 2 s, 4 s ... até 30 s).
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { enderecoNaApi, urlDaApi } from './api';
import { chaves } from './consultas';

const ESPERA_MAXIMA_MS = 30_000;

export function esperaParaReconectar(tentativa: number): number {
  return Math.min(1000 * 2 ** tentativa, ESPERA_MAXIMA_MS);
}

interface Opcoes {
  base?: string;
  /** Construtor do EventSource (os testes passam um falso). */
  Fonte?: typeof EventSource;
}

export function useAvisosDaApi({ base = urlDaApi(), Fonte = globalThis.EventSource }: Opcoes = {}): void {
  const cliente = useQueryClient();

  useEffect(() => {
    if (!base || !Fonte) return;
    let fonte: EventSource | undefined;
    let espera: ReturnType<typeof setTimeout> | undefined;
    let tentativa = 0;
    let ativo = true;

    const abrir = () => {
      fonte = new Fonte(enderecoNaApi('/v1/eventos', base));
      fonte.addEventListener('open', () => {
        tentativa = 0;
      });
      fonte.addEventListener('conclusao', () => {
        void cliente.invalidateQueries({ queryKey: chaves.catalogo });
      });
      fonte.addEventListener('error', () => {
        if (!ativo || fonte?.readyState !== Fonte.CLOSED) return; // CONNECTING: o navegador já está reconectando
        fonte.close();
        espera = setTimeout(abrir, esperaParaReconectar(tentativa++));
      });
    };
    abrir();

    return () => {
      ativo = false;
      clearTimeout(espera);
      fonte?.close();
    };
  }, [base, Fonte, cliente]);
}
