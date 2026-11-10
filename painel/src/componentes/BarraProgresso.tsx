// T2.3: barra de progresso acessível, com o texto equivalente ao lado.
import { textoDoProgresso } from '../progresso';
import type { Progresso } from '../tipos';

interface Props {
  /** Id do elemento que dá nome à barra (aria-labelledby). */
  idDoRotulo: string;
  progresso: Progresso;
}

export function BarraProgresso({ idDoRotulo, progresso }: Props) {
  const texto = textoDoProgresso(progresso);
  return (
    <div className="progresso">
      <div
        className="barra"
        role="progressbar"
        aria-labelledby={idDoRotulo}
        aria-valuemin={0}
        aria-valuemax={progresso.total}
        aria-valuenow={progresso.feitos}
        aria-valuetext={texto}
      >
        <span className="preenchido" style={{ width: `${progresso.percentual}%` }} />
      </div>
      <p className="itens">{texto}</p>
    </div>
  );
}
