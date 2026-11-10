// T4.15: o conteúdo da janela de detalhe de um item.
import type { Item, Trilha } from '../tipos';
import { Roadmaps } from './Roadmaps';
import { TextoDoItem } from './TextoDoItem';

const ISSUES = 'https://github.com/learnTECH-community/formacao-dev/issues';

export function DetalheDoItem({ item, trilha }: { item: Item; trilha: Trilha }) {
  return (
    <div className="detalhe-do-item">
      <p>
        <TextoDoItem texto={item.texto} />
      </p>
      <dl>
        <dt>Trilha</dt>
        <dd>{`${trilha.codigo} · ${trilha.nome}`}</dd>
        <dt>Situação</dt>
        <dd>{item.feito ? 'Feito' : 'A fazer'}</dd>
      </dl>
      <Roadmaps roadmaps={trilha.roadmaps} />
      <p>
        <a href={`${ISSUES}?q=${encodeURIComponent(`"${item.codigo}"`)}`}>{`Issues de ${item.codigo} no GitHub`}</a>
      </p>
    </div>
  );
}
