// T3.3: filtros da lista de itens, por trilha e por situação.
import { ehSituacao } from '../filtro';
import type { FiltroEscolhido } from '../filtroNoEndereco';
import type { Trilha } from '../tipos';

export type { FiltroEscolhido };

interface Props {
  trilhas: Pick<Trilha, 'codigo' | 'nome'>[];
  filtro: FiltroEscolhido;
  /** Sem catálogo carregado, os filtros ficam desligados: não há o que filtrar. */
  ligado: boolean;
  aoMudar: (filtro: FiltroEscolhido) => void;
}

export function Filtros({ trilhas, filtro, ligado, aoMudar }: Props) {
  return (
    <form className="filtros" id="filtros" aria-label="Filtrar itens" onSubmit={(e) => e.preventDefault()}>
      <div className="campo">
        <label htmlFor="filtro-trilha">Trilha</label>
        <select
          id="filtro-trilha"
          name="trilha"
          value={filtro.trilha}
          disabled={!ligado}
          onChange={(e) => aoMudar({ ...filtro, trilha: e.target.value })}
        >
          <option value="">Todas as trilhas</option>
          {trilhas.map((t) => (
            <option key={t.codigo} value={t.codigo}>{`${t.codigo} · ${t.nome}`}</option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="filtro-situacao">Situação</label>
        <select
          id="filtro-situacao"
          name="situacao"
          value={filtro.situacao}
          disabled={!ligado}
          onChange={(e) => aoMudar({ ...filtro, situacao: ehSituacao(e.target.value) ? e.target.value : 'todos' })}
        >
          <option value="todos">Todos</option>
          <option value="feitos">Feitos</option>
          <option value="a-fazer">A fazer</option>
        </select>
      </div>
    </form>
  );
}
