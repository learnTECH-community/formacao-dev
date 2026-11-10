// Cartão da trilha na seção "Trilhas": nome, progresso e links do roadmap.sh.
import { progressoDe } from '../progresso';
import type { Roadmap, Trilha } from '../tipos';
import { BarraProgresso } from './BarraProgresso';

function Roadmaps({ roadmaps }: { roadmaps: Roadmap[] }) {
  return (
    <p className="roadmaps">
      Estudo no roadmap.sh:{' '}
      {roadmaps.map((r, i) => (
        <span key={r.url}>
          {i > 0 && ' · '}
          <a href={r.url}>{r.nome}</a>
        </span>
      ))}
    </p>
  );
}

export function CartaoTrilha({ trilha }: { trilha: Trilha }) {
  const id = `nome-${trilha.codigo.toLowerCase()}`;
  return (
    <li className="trilha" id={`trilha-${trilha.codigo.toLowerCase()}`}>
      <h3 id={id}>
        <span className="codigo">{trilha.codigo}</span>
        {` ${trilha.nome}`}
      </h3>
      <BarraProgresso idDoRotulo={id} progresso={progressoDe(trilha.itens)} />
      <Roadmaps roadmaps={trilha.roadmaps} />
    </li>
  );
}
