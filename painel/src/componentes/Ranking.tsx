// T6.9: tabela "Quem mais concluiu", com o resultado de GET /v1/ranking.
// Só aparece com a API configurada (VITE_API_URL). Empate: a mesma posição, com "(empate)".
import { useQuery } from '@tanstack/react-query';
import { pedirNaApi, urlDaApi } from '../api';
import { chaves } from '../consultas';

export interface LinhaDoRanking {
  posicao: number;
  usuario: string;
  concluidos: number;
  empatado: boolean;
}

const MAXIMO_DE_LINHAS = 10;

export function Ranking({ base = urlDaApi() }: { base?: string }) {
  const consulta = useQuery({
    queryKey: [...chaves.catalogo, 'ranking', base] as const,
    queryFn: ({ signal }) => pedirNaApi<{ ranking: LinhaDoRanking[] }>('/v1/ranking', { sinal: signal, base }),
    enabled: Boolean(base),
  });
  if (!base) return null;

  return (
    <section className="faixa" id="ranking" aria-labelledby="titulo-ranking" aria-busy={consulta.isPending}>
      <h2 id="titulo-ranking">Quem mais concluiu</h2>
      {consulta.isPending && <p role="status">Carregando o ranking…</p>}
      {consulta.isError && <p role="alert">Não foi possível carregar o ranking.</p>}
      {consulta.isSuccess && consulta.data.ranking.length === 0 && <p>Ninguém concluiu um item ainda.</p>}
      {consulta.isSuccess && consulta.data.ranking.length > 0 && (
        <table className="ranking">
          <caption>As {Math.min(MAXIMO_DE_LINHAS, consulta.data.ranking.length)} primeiras posições, pelo número de itens concluídos</caption>
          <thead>
            <tr>
              <th scope="col">Posição</th>
              <th scope="col">Pessoa</th>
              <th scope="col">Itens</th>
            </tr>
          </thead>
          <tbody>
            {consulta.data.ranking.slice(0, MAXIMO_DE_LINHAS).map((l) => (
              <tr key={l.usuario}>
                <td>
                  {l.posicao}º{l.empatado ? ' (empate)' : ''}
                </td>
                <th scope="row">
                  <a href={`https://github.com/${encodeURIComponent(l.usuario)}`}>{l.usuario}</a>
                </th>
                <td>{l.concluidos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
