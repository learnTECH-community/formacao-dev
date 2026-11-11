// T4.1: o painel em componentes React. As funções puras (catálogo, progresso e
// filtro) são as mesmas da T3; aqui só se decide o que aparece na tela.
// T4.3: as páginas (início e detalhe da trilha) têm rota própria; o catálogo é
// buscado uma vez aqui e passa para a página da vez.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Route, Routes } from 'react-router';
import { Avisos } from './componentes/Avisos';
import { BarraProgresso } from './componentes/BarraProgresso';
import { Rodape, Topo } from './componentes/Moldura';
import { Inicio } from './paginas/Inicio';
import { NaoEncontrada } from './paginas/NaoEncontrada';
import { progressoTotal } from './progresso';
import { useAvisosDaApi } from './useAvisosDaApi';
import { mensagemDeErro, useCatalogo } from './useCatalogo';

// T4.14: o detalhe da trilha (com a janela modal da T4.15) vira um arquivo separado no
// build e só é baixado quando alguém abre /trilha/<código>.
const DetalheTrilha = lazy(() => import('./paginas/DetalheTrilha').then((m) => ({ default: m.DetalheTrilha })));

// T4.12: o formulário (com o Zod) só é baixado ao abrir /propor.
const ProporItem = lazy(() => import('./paginas/ProporItem').then((m) => ({ default: m.ProporItem })));

export function App() {
  const catalogo = useCatalogo();
  useAvisosDaApi();
  const estado = useRef<HTMLDivElement>(null);
  const levarFoco = useRef(false);
  const [pedidoDeFoco, setPedidoDeFoco] = useState(0);

  // Depois de "Tentar de novo", o foco vai para o título da página, que agora tem conteúdo.
  useEffect(() => {
    if (catalogo.situacao === 'carregando') return;
    if (catalogo.situacao === 'pronto' && levarFoco.current) setPedidoDeFoco((n) => n + 1);
    levarFoco.current = false;
  }, [catalogo.situacao]);

  function tentarDeNovo() {
    estado.current?.focus(); // o botão some durante a nova tentativa; o foco não se perde
    levarFoco.current = true;
    catalogo.tentarDeNovo();
  }

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
        <BarraProgresso idDoRotulo="rotulo-total" progresso={progressoTotal(catalogo.trilhas)} />
      </>
    ) : null;

  const pagina = { catalogo, pedidoDeFoco };

  return (
    <>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Topo total={total} ocupado={catalogo.situacao === 'carregando'} />
      <main id="conteudo" tabIndex={-1}>
        <Avisos ref={estado} status={status} erro={erro} />
        <Routes>
          <Route path="/" element={<Inicio {...pagina} />} />
          <Route
            path="/trilha/:codigo"
            element={
              <Suspense fallback={<CarregandoPagina />}>
                <DetalheTrilha {...pagina} />
              </Suspense>
            }
          />
          <Route
            path="/propor"
            element={
              <Suspense fallback={<p className="faixa" role="status">Carregando o formulário…</p>}>
                <ProporItem {...pagina} />
              </Suspense>
            }
          />
          <Route path="*" element={<NaoEncontrada pedidoDeFoco={pedidoDeFoco} />} />
        </Routes>
      </main>
      <Rodape />
    </>
  );
}

/** Espera do detalhe sob demanda: anunciada ao leitor de tela, com aria-busy na região. */
function CarregandoPagina() {
  return (
    <section className="faixa" aria-busy="true" aria-labelledby="titulo-carregando">
      <h2 id="titulo-carregando">Carregando a página</h2>
      <p role="status">Carregando o detalhe da trilha…</p>
    </section>
  );
}
