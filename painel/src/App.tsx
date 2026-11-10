// T4.1: o painel em componentes React. As funções puras (catálogo, progresso e
// filtro) são as mesmas da T3; aqui só se decide o que aparece na tela.
import { useEffect, useRef, useState } from 'react';
import { Avisos } from './componentes/Avisos';
import { BarraProgresso } from './componentes/BarraProgresso';
import { CartaoTrilha } from './componentes/CartaoTrilha';
import { Filtros, type FiltroEscolhido } from './componentes/Filtros';
import { GrupoDeItens } from './componentes/GrupoDeItens';
import { ComoParticipar, Rodape, Topo } from './componentes/Moldura';
import { filtrarItens, textoDaContagem } from './filtro';
import { progressoTotal } from './progresso';
import type { Trilha } from './tipos';
import { mensagemDeErro, useCatalogo } from './useCatalogo';

const SEM_TRILHAS: Trilha[] = [];

export function App() {
  const catalogo = useCatalogo();
  const [filtro, setFiltro] = useState<FiltroEscolhido>({ trilha: '', situacao: 'todos' });
  const estado = useRef<HTMLDivElement>(null);
  const tituloTrilhas = useRef<HTMLHeadingElement>(null);
  const levarFoco = useRef(false);

  const carregando = catalogo.situacao === 'carregando';
  const trilhas = catalogo.situacao === 'pronto' ? catalogo.trilhas : SEM_TRILHAS;

  // Depois de "Tentar de novo", o foco vai para o começo do catálogo, que agora está na tela.
  useEffect(() => {
    if (catalogo.situacao === 'carregando') return;
    if (catalogo.situacao === 'pronto' && levarFoco.current) tituloTrilhas.current?.focus();
    levarFoco.current = false;
  }, [catalogo.situacao]);

  function tentarDeNovo() {
    estado.current?.focus(); // o botão some durante a nova tentativa; o foco não se perde
    levarFoco.current = true;
    catalogo.tentarDeNovo();
  }

  // Trilha escolhida que não existe mais no catálogo cai para "todas".
  const trilhaValida = trilhas.some((t) => t.codigo === filtro.trilha) ? filtro.trilha : '';
  const filtroEmUso: FiltroEscolhido = { ...filtro, trilha: trilhaValida };
  const visiveis = filtrarItens(trilhas, filtroEmUso);
  const totalDeItens = trilhas.flatMap((t) => t.itens).length;
  const mostrados = visiveis.flatMap((t) => t.itens).length;

  const status =
    catalogo.situacao === 'carregando'
      ? 'Carregando o catálogo…'
      : catalogo.situacao === 'vazio'
        ? 'O catálogo ainda não tem itens. Proponha o primeiro com o modelo "Novo item" no GitHub.'
        : '';

  const erro =
    catalogo.situacao === 'erro' ? (
      <>
        <p>
          <strong>Não foi possível carregar o catálogo.</strong>
          {` ${mensagemDeErro(catalogo.erro)}`}
        </p>
        <p>
          <button type="button" className="botao" onClick={tentarDeNovo}>
            Tentar de novo
          </button>
        </p>
      </>
    ) : null;

  const total =
    catalogo.situacao === 'pronto' ? (
      <>
        <p className="total-rotulo" id="rotulo-total">
          Progresso do catálogo
        </p>
        <BarraProgresso idDoRotulo="rotulo-total" progresso={progressoTotal(trilhas)} />
      </>
    ) : null;

  return (
    <>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Topo total={total} ocupado={carregando} />
      <main id="conteudo" tabIndex={-1}>
        <Avisos ref={estado} status={status} erro={erro} />
        <section className="faixa" id="trilhas" aria-labelledby="titulo-trilhas" aria-busy={carregando}>
          <h2 id="titulo-trilhas" tabIndex={-1} ref={tituloTrilhas}>
            Trilhas
          </h2>
          <ol className="trilhas" id="lista-trilhas">
            {trilhas.map((t) => (
              <CartaoTrilha key={t.codigo} trilha={t} />
            ))}
          </ol>
        </section>
        <section className="faixa" id="itens" aria-labelledby="titulo-itens" aria-busy={carregando}>
          <h2 id="titulo-itens">Itens</h2>
          <Filtros trilhas={trilhas} filtro={filtroEmUso} ligado={catalogo.situacao === 'pronto'} aoMudar={setFiltro} />
          <p className="contagem" id="contagem" aria-live="polite">
            {catalogo.situacao === 'pronto' ? textoDaContagem(mostrados, totalDeItens) : ''}
          </p>
          <div id="lista-itens">
            {visiveis.map((t) => (
              <GrupoDeItens key={t.codigo} trilha={t} />
            ))}
          </div>
        </section>
        <ComoParticipar />
      </main>
      <Rodape />
    </>
  );
}
