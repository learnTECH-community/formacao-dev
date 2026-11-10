// T4.15: janela modal com portal. Fica fora do #app (createPortal no <body>), prende o
// foco, fecha com Esc ou com o botão e devolve o foco a quem a abriu.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

export function JanelaModal({ titulo, aoFechar, children }: Props) {
  const idTitulo = useId();
  const janela = useRef<HTMLDivElement>(null);
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  }, [aoFechar]);

  useEffect(() => {
    const quemAbriu = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // O resto da página fica inerte: nem clique nem Tab chegam lá, e o leitor de tela não o lê.
    const resto = document.getElementById('app');
    resto?.setAttribute('inert', '');
    janela.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        fechar.current();
        return;
      }
      if (evento.key !== 'Tab' || !janela.current) return;
      // Foco preso: do último volta ao primeiro, e do primeiro (com Shift) vai ao último.
      const focaveis = [...janela.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;
      if (evento.shiftKey && (atual === primeiro || atual === janela.current)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && atual === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      resto?.removeAttribute('inert');
      quemAbriu?.focus(); // o foco volta ao botão que abriu
    };
  }, []);

  return createPortal(
    <div className="fundo-modal">
      <div className="janela-modal" role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1} ref={janela}>
        <div className="cabeca-modal">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="botao" onClick={aoFechar}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
