// Cartão da trilha na seção "Trilhas": nome (link para o detalhe), progresso e links do roadmap.sh.
import { Link } from 'react-router';
import { progressoDe } from '../progresso';
import { enderecoDaTrilha } from '../rotas';
import type { Trilha } from '../tipos';
import { BarraProgresso } from './BarraProgresso';
import { Roadmaps } from './Roadmaps';

export function CartaoTrilha({ trilha }: { trilha: Trilha }) {
  const id = `nome-${trilha.codigo.toLowerCase()}`;
  return (
    <li className="trilha" id={`trilha-${trilha.codigo.toLowerCase()}`}>
      <h3 id={id}>
        <Link to={enderecoDaTrilha(trilha.codigo)}>
          <span className="codigo">{trilha.codigo}</span>
          {` ${trilha.nome}`}
        </Link>
      </h3>
      <BarraProgresso idDoRotulo={id} progresso={progressoDe(trilha.itens)} />
      <Roadmaps roadmaps={trilha.roadmaps} />
    </li>
  );
}
