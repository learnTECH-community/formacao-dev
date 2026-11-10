// Um item do catálogo, com a situação escrita (não só a cor) e o botão de fixar (T4.8).
import { memo } from 'react';
import type { Item } from '../tipos';
import { TextoDoItem } from './TextoDoItem';

interface Props {
  item: Item;
  fixado: boolean;
  aoAlternarFixado: (codigo: string) => void;
}

/**
 * T4.5: com memo, fixar um item ou mudar o filtro não renderiza de novo os outros itens
 * da lista (medido em renderizacoes.test.tsx: de 1.001 para 1 item ao fixar).
 */
export const ItemDoCatalogo = memo(function ItemDoCatalogo({ item, fixado, aoAlternarFixado }: Props) {
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
});
