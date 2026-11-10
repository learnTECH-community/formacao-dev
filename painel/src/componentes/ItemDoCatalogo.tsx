// Um item do catálogo, com a situação escrita (não só a cor) e o botão de fixar (T4.8).
import type { Item } from '../tipos';
import { TextoDoItem } from './TextoDoItem';

interface Props {
  item: Item;
  fixado: boolean;
  aoAlternarFixado: (codigo: string) => void;
}

export function ItemDoCatalogo({ item, fixado, aoAlternarFixado }: Props) {
  return (
    <li className="item" data-feito={String(item.feito)}>
      <span className="codigo-item">{item.codigo}</span>
      <span className="texto-item">
        <TextoDoItem texto={item.texto} />
      </span>
      <span className="situacao">{item.feito ? 'Feito' : 'A fazer'}</span>
      <button
        type="button"
        className="botao-fixar"
        aria-pressed={fixado}
        aria-label={`Fixar ${item.codigo}`}
        onClick={() => aoAlternarFixado(item.codigo)}
      >
        Fixar
      </button>
    </li>
  );
}
