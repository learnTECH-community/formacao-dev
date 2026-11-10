// T4.8: itens fixados pela pessoa, guardados no navegador.
import type { Item, Trilha } from '../tipos';
import { ItemDoCatalogo } from './ItemDoCatalogo';

interface Props {
  trilhas: Trilha[];
  fixados: readonly string[];
  aoAlternarFixado: (codigo: string) => void;
  aoLimpar: () => void;
}

export function Fixados({ trilhas, fixados, aoAlternarFixado, aoLimpar }: Props) {
  const porCodigo = new Map<string, Item>(trilhas.flatMap((t) => t.itens.map((i) => [i.codigo, i] as const)));
  // Código guardado que não existe mais no catálogo não aparece.
  const itens = fixados.flatMap((c) => porCodigo.get(c) ?? []);
  return (
    <section className="faixa" id="fixados" aria-labelledby="titulo-fixados">
      <h2 id="titulo-fixados">Fixados</h2>
      {itens.length === 0 ? (
        <p className="contagem">Nenhum item fixado. Use o botão "Fixar" de um item para guardá-lo aqui.</p>
      ) : (
        <>
          <ul className="lista-itens">
            {itens.map((item) => (
              <ItemDoCatalogo key={item.codigo} item={item} fixado aoAlternarFixado={aoAlternarFixado} />
            ))}
          </ul>
          <p>
            <button type="button" className="botao" onClick={aoLimpar}>
              Limpar fixados
            </button>
          </p>
        </>
      )}
    </section>
  );
}
