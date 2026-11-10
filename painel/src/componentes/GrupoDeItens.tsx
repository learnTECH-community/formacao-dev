// Grupo de itens de uma trilha na seção "Itens".
import type { Trilha } from '../tipos';
import { ItemDoCatalogo } from './ItemDoCatalogo';

export function GrupoDeItens({ trilha }: { trilha: Trilha }) {
  const id = `itens-${trilha.codigo.toLowerCase()}`;
  return (
    <section className="grupo" aria-labelledby={id}>
      <h3 id={id}>
        <span className="codigo">{trilha.codigo}</span>
        {` ${trilha.nome}`}
      </h3>
      <ul className="lista-itens">
        {trilha.itens.map((item) => (
          <ItemDoCatalogo key={item.codigo} item={item} />
        ))}
      </ul>
    </section>
  );
}
