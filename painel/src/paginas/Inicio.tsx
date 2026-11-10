// Página inicial: trilhas com o progresso, itens com filtro e como participar.
// T4.2: o filtro vive no endereço (?trilha=T2&situacao=feitos).
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CartaoTrilha } from '../componentes/CartaoTrilha';
import { Fixados } from '../componentes/Fixados';
import { Filtros } from '../componentes/Filtros';
import { GrupoDeItens } from '../componentes/GrupoDeItens';
import { ComoParticipar } from '../componentes/Moldura';
import { useAcoesDePreferencias, usePreferencias } from '../estado/usePreferencias';
import { filtrarItens, textoDaContagem } from '../filtro';
import { escreverFiltro, lerFiltro, type FiltroEscolhido } from '../filtroNoEndereco';
import type { PropsDePagina } from '../rotas';
import type { Trilha } from '../tipos';
import { useFocoNoTitulo, useTituloDaAba } from '../useFocoNoTitulo';

const SEM_TRILHAS: Trilha[] = [];

export function Inicio({ catalogo, pedidoDeFoco }: PropsDePagina) {
  const [parametros, setParametros] = useSearchParams();
  const titulo = useRef<HTMLHeadingElement>(null);
  useTituloDaAba();
  useFocoNoTitulo(titulo, pedidoDeFoco);

  const { fixados } = usePreferencias();
  const despachar = useAcoesDePreferencias();
  const alternarFixado = (codigo: string) => despachar({ tipo: 'alternar-fixado', codigo });

  const carregando = catalogo.situacao === 'carregando';
  const pronto = catalogo.situacao === 'pronto';
  const trilhas = pronto ? catalogo.trilhas : SEM_TRILHAS;

  // O endereço é a fonte do filtro. A cópia local existe porque o React Router troca o
  // endereço numa transição: sem ela, o <select> controlado volta ao valor antigo até a
  // transição terminar, e uma segunda seta do teclado se perde.
  const codigos = trilhas.map((t) => t.codigo).join(' ');
  const lido = () => lerFiltro(parametros, codigos.split(' '));
  const [filtro, setFiltro] = useState<FiltroEscolhido>(lido);
  // Voltar, Avançar, link com filtro ou catálogo recém-chegado: o endereço manda.
  // Ajuste durante a renderização, sem efeito (padrão da documentação do React).
  const fonte = `${parametros.toString()}|${codigos}`;
  const [fonteVista, setFonteVista] = useState(fonte);
  if (fonteVista !== fonte) {
    setFonteVista(fonte);
    setFiltro(lido());
  }

  // Cada mudança vira uma entrada no histórico, para Voltar e Avançar restaurarem o filtro.
  const aoMudar = (novo: FiltroEscolhido) => {
    setFiltro(novo);
    setParametros(escreverFiltro(novo));
  };

  const visiveis = filtrarItens(trilhas, filtro);
  const total = trilhas.flatMap((t) => t.itens).length;
  const mostrados = visiveis.flatMap((t) => t.itens).length;

  return (
    <>
      <section className="faixa" id="trilhas" aria-labelledby="titulo-trilhas" aria-busy={carregando}>
        <h2 id="titulo-trilhas" tabIndex={-1} ref={titulo}>
          Trilhas
        </h2>
        <ol className="trilhas" id="lista-trilhas">
          {trilhas.map((t) => (
            <CartaoTrilha key={t.codigo} trilha={t} />
          ))}
        </ol>
      </section>
      {pronto && (
        <Fixados
          trilhas={trilhas}
          fixados={fixados}
          aoAlternarFixado={alternarFixado}
          aoLimpar={() => despachar({ tipo: 'limpar-fixados' })}
        />
      )}
      <section className="faixa" id="itens" aria-labelledby="titulo-itens" aria-busy={carregando}>
        <h2 id="titulo-itens">Itens</h2>
        <Filtros trilhas={trilhas} filtro={filtro} ligado={pronto} aoMudar={aoMudar} />
        <p className="contagem" id="contagem" aria-live="polite">
          {pronto ? textoDaContagem(mostrados, total) : ''}
        </p>
        <div id="lista-itens">
          {visiveis.map((t) => (
            <GrupoDeItens key={t.codigo} trilha={t} fixados={fixados} aoAlternarFixado={alternarFixado} />
          ))}
        </div>
      </section>
      <ComoParticipar />
    </>
  );
}
