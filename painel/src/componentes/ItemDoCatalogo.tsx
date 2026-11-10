// Um item do catálogo, com a situação escrita (não só a cor).
import type { Item } from '../tipos';
import { TextoDoItem } from './TextoDoItem';

export function ItemDoCatalogo({ item }: { item: Item }) {
  return (
    <li className="item" data-feito={String(item.feito)}>
      <span className="codigo-item">{item.codigo}</span>
      <span className="texto-item">
        <TextoDoItem texto={item.texto} />
      </span>
      <span className="situacao">{item.feito ? 'Feito' : 'A fazer'}</span>
    </li>
  );
}
