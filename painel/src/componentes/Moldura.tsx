// Partes fixas da página: cabeçalho com navegação e rodapé.
import type { ReactNode } from 'react';
import { BotaoTema } from './BotaoTema';

const GITHUB = 'https://github.com/learnTECH-community/formacao-dev';

interface PropsTopo {
  /** Progresso do catálogo, mostrado quando já carregou. */
  total?: ReactNode;
  ocupado: boolean;
}

export function Topo({ total, ocupado }: PropsTopo) {
  return (
    <header className="topo">
      <div className="faixa">
        <p className="marca">learnTECH Community</p>
        <h1>Painel de Formação</h1>
        <p className="resumo">As 12 trilhas do catálogo de formação fullstack. Cada item é praticado neste painel.</p>
        <nav aria-label="Principal">
          <ul className="menu">
            <li>
              <a href="#trilhas">Trilhas</a>
            </li>
            <li>
              <a href="#itens">Itens</a>
            </li>
            <li>
              <a href="#como-participar">Como participar</a>
            </li>
            <li>
              <a href={`${GITHUB}/blob/main/CATALOGO.md`}>Catálogo no GitHub</a>
            </li>
          </ul>
        </nav>
        <div className="total" id="total" aria-busy={ocupado}>
          {total}
        </div>
        <BotaoTema />
      </div>
    </header>
  );
}

export function ComoParticipar() {
  return (
    <section className="faixa" id="como-participar" aria-labelledby="titulo-participar">
      <h2 id="titulo-participar">Como participar</h2>
      <ol className="passos">
        <li>
          Escolha um item no catálogo ou uma issue com o rótulo <code>item-do-catalogo</code>.
        </li>
        <li>Comente na issue que vai fazer.</li>
        <li>Pratique neste painel e abra um PR com o código do item no título.</li>
      </ol>
      <p>
        O passo a passo completo está no <a href={`${GITHUB}/blob/main/CONTRIBUTING.md`}>guia de contribuição</a>.
      </p>
    </section>
  );
}

export function Rodape() {
  return (
    <footer className="rodape">
      <div className="faixa">
        <p>Código e textos sob licença MIT. Sem afiliação com o roadmap.sh: usamos só os links das trilhas.</p>
        <p>
          <a href={GITHUB}>Repositório no GitHub</a>
        </p>
      </div>
    </footer>
  );
}
