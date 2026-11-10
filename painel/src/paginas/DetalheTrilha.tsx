// T4.3: página de detalhe da trilha, em /trilha/<código>.
import { useRef } from 'react';
import { Link, useParams } from 'react-router';
import { BarraProgresso } from '../componentes/BarraProgresso';
import { ItemDoCatalogo } from '../componentes/ItemDoCatalogo';
import { Roadmaps } from '../componentes/Roadmaps';
import { progressoDe } from '../progresso';
import type { PropsDePagina } from '../rotas';
import { useFocoNoTitulo, useTituloDaAba } from '../useFocoNoTitulo';

export function DetalheTrilha({ catalogo, pedidoDeFoco }: PropsDePagina) {
  const { codigo = '' } = useParams();
  const titulo = useRef<HTMLHeadingElement>(null);
  const trilha = catalogo.situacao === 'pronto' ? catalogo.trilhas.find((t) => t.codigo === codigo) : undefined;
  const naoExiste = catalogo.situacao !== 'carregando' && catalogo.situacao !== 'erro' && !trilha;

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
              <ItemDoCatalogo key={item.codigo} item={item} />
            ))}
          </ul>
        </>
      ) : (
        <h2 id="titulo-detalhe" tabIndex={-1} ref={titulo}>
          {naoExiste ? 'Trilha não encontrada' : `Trilha ${codigo}`}
        </h2>
      )}
      {naoExiste && <p>{`Não há trilha com o código "${codigo}" no catálogo.`}</p>}
    </section>
  );
}
