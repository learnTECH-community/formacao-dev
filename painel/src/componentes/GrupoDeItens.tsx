// Grupo de itens de uma trilha na seção "Itens".
import type { Trilha } from '../tipos';
import { ItemDoCatalogo } from './ItemDoCatalogo';
import { LimiteDeErro } from './LimiteDeErro';

interface Props {
  trilha: Trilha;
  fixados: readonly string[];
  aoAlternarFixado: (codigo: string) => void;
}

export function GrupoDeItens({ trilha, fixados, aoAlternarFixado }: Props) {
  const id = `itens-${trilha.codigo.toLowerCase()}`;
  return (
    <section className="grupo" aria-labelledby={id}>
      <h3 id={id}>
        <span className="codigo">{trilha.codigo}</span>
        {` ${trilha.nome}`}
      </h3>
      <LimiteDeErro nome={`os itens da trilha ${trilha.codigo}`}>
        <ul className="lista-itens">
          {trilha.itens.map((item) => (
            <ItemDoCatalogo
              key={item.codigo}
              item={item}
              fixado={fixados.includes(item.codigo)}
              aoAlternarFixado={aoAlternarFixado}
            />
          ))}
        </ul>
      </LimiteDeErro>
    </section>
  );
}
