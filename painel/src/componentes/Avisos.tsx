// T3.5: regiões de aviso. Ficam sempre na página (leitores de tela anunciam melhor
// uma região viva que já existe); só o conteúdo muda.
import type { ReactNode, Ref } from 'react';

interface Props {
  status?: string;
  erro?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function Avisos({ status, erro, ref }: Props) {
  return (
    <div className="faixa estado" id="estado" tabIndex={-1} ref={ref}>
      <p className="aviso" id="aviso-status" role="status">
        {status}
      </p>
      <div className="aviso aviso-erro" id="aviso-erro" role="alert">
        {erro}
      </div>
    </div>
  );
}
