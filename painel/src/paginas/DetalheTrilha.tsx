// T4.3: página de detalhe da trilha, em /trilha/<código>.
import { useCallback, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { BarraProgresso } from '../componentes/BarraProgresso';
import { DetalheDoItem } from '../componentes/DetalheDoItem';
import { ItemDoCatalogo } from '../componentes/ItemDoCatalogo';
import { JanelaModal } from '../componentes/JanelaModal';
import { Roadmaps } from '../componentes/Roadmaps';
import { useAcoesDePreferencias, useFixados } from '../estado/usePreferencias';
import { progressoDe } from '../progresso';
import type { PropsDePagina } from '../rotas';
import { useTrilha } from '../useCatalogo';
import { useFocoNoTitulo, useTituloDaAba } from '../useFocoNoTitulo';

export function DetalheTrilha({ catalogo, pedidoDeFoco }: PropsDePagina) {
  const { codigo = '' } = useParams();
  const titulo = useRef<HTMLHeadingElement>(null);
  const fixados = useFixados();
  const despachar = useAcoesDePreferencias();
  const alternarFixado = useCallback((c: string) => despachar({ tipo: 'alternar-fixado', codigo: c }), [despachar]);
  // T4.11: a trilha tem chave de consulta própria; o estado geral (carregando, erro) vem do catálogo.
  const daConsulta = useTrilha(codigo);
  const trilha = catalogo.situacao === 'pronto' ? (daConsulta ?? undefined) : undefined;
  const [aberto, setAberto] = useState<string | null>(null);
  const itemAberto = trilha?.itens.find((i) => i.codigo === aberto);
  const fecharDetalhes = useCallback(() => setAberto(null), []);
  const naoExiste = catalogo.situacao === 'vazio' || (catalogo.situacao === 'pronto' && daConsulta === null);

  useTituloDaAba(trilha ? `${trilha.codigo} ${trilha.nome}` : naoExiste ? 'Trilha não encontrada' : undefined);
  useFocoNoTitulo(titulo, pedidoDeFoco);

  return (
    <section className="faixa detalhe" aria-labelledby="titulo-detalhe" aria-busy={catalogo.situacao === 'carregando'}>
      <p className="voltar">
        <Link to="/">Voltar ao painel</Link>
      </p>
      {trilha ? (
        <>
          <h2 id="titulo-detalhe" tabIndex={-1} ref={titulo}>
            <span className="codigo">{trilha.codigo}</span>
            {` ${trilha.nome}`}
          </h2>
          <BarraProgresso idDoRotulo="titulo-detalhe" progresso={progressoDe(trilha.itens)} />
          <Roadmaps roadmaps={trilha.roadmaps} />
          <h3>Itens da trilha</h3>
          <ul className="lista-itens">
            {trilha.itens.map((item) => (
              <ItemDoCatalogo
                key={item.codigo}
                item={item}
                fixado={fixados.includes(item.codigo)}
                aoAlternarFixado={alternarFixado}
                aoVerDetalhes={setAberto}
              />
            ))}
          </ul>
        </>
      ) : (
        <h2 id="titulo-detalhe" tabIndex={-1} ref={titulo}>
          {naoExiste ? 'Trilha não encontrada' : `Trilha ${codigo}`}
        </h2>
      )}
      {trilha && itemAberto && (
        <JanelaModal titulo={`${itemAberto.codigo} · ${trilha.nome}`} aoFechar={fecharDetalhes}>
          <DetalheDoItem item={itemAberto} trilha={trilha} />
        </JanelaModal>
      )}
      {naoExiste && <p>{`Não há trilha com o código "${codigo}" no catálogo.`}</p>}
    </section>
  );
}
