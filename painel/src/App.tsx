// T4.1: o painel em componentes React. As funções puras (catálogo, progresso e
// filtro) são as mesmas da T3; aqui só se decide o que aparece na tela.
// T4.3: as páginas (início e detalhe da trilha) têm rota própria; o catálogo é
// buscado uma vez aqui e passa para a página da vez.
import { useEffect, useRef, useState } from 'react';
import { Route, Routes } from 'react-router';
import { Avisos } from './componentes/Avisos';
import { BarraProgresso } from './componentes/BarraProgresso';
import { Rodape, Topo } from './componentes/Moldura';
import { DetalheTrilha } from './paginas/DetalheTrilha';
import { Inicio } from './paginas/Inicio';
import { NaoEncontrada } from './paginas/NaoEncontrada';
import { progressoTotal } from './progresso';
import { mensagemDeErro, useCatalogo } from './useCatalogo';

export function App() {
  const catalogo = useCatalogo();
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
          <Route path="/trilha/:codigo" element={<DetalheTrilha {...pagina} />} />
          <Route path="*" element={<NaoEncontrada pedidoDeFoco={pedidoDeFoco} />} />
        </Routes>
      </main>
      <Rodape />
    </>
  );
}
