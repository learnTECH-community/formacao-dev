// T4.12: formulário "Propor item". Valida com Zod e devolve um link para abrir a issue
// no modelo "Novo item" do GitHub. Nenhum dado sai do navegador por este formulário.
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  linkDaIssue,
  validarProposta,
  type CampoDaProposta,
  type ErrosDaProposta,
} from '../proposta';
import type { PropsDePagina } from '../rotas';
import { useFocoNoTitulo, useTituloDaAba } from '../useFocoNoTitulo';

const VAZIO: Record<CampoDaProposta, string> = { trilha: '', roadmap: '', topico: '', tarefa: '', criterios: '' };
const ORDEM: CampoDaProposta[] = ['trilha', 'roadmap', 'topico', 'tarefa', 'criterios'];

interface PropsDoCampo {
  campo: CampoDaProposta;
  rotulo: string;
  dica: string;
  erro?: string;
  children: (atributos: {
    id: string;
    name: string;
    'aria-describedby': string;
    'aria-invalid': boolean;
  }) => ReactNode;
}

/** Rótulo, dica e erro ligados ao campo por id (aria-describedby). */
function Campo({ campo, rotulo, dica, erro, children }: PropsDoCampo) {
  const id = `proposta-${campo}`;
  const descricao = erro ? `${id}-dica ${id}-erro` : `${id}-dica`;
  return (
    <div className="campo campo-largo">
      <label htmlFor={id}>{rotulo}</label>
      <p className="dica" id={`${id}-dica`}>
        {dica}
      </p>
      {children({ id, name: campo, 'aria-describedby': descricao, 'aria-invalid': Boolean(erro) })}
      {erro && (
        <p className="erro-do-campo" id={`${id}-erro`}>
          {erro}
        </p>
      )}
    </div>
  );
}

export function ProporItem({ catalogo, pedidoDeFoco }: PropsDePagina) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  useTituloDaAba('Propor item');
  useFocoNoTitulo(titulo, pedidoDeFoco);

  const trilhas = catalogo.situacao === 'pronto' ? catalogo.trilhas : [];
  const [dados, setDados] = useState(VAZIO);
  const [erros, setErros] = useState<ErrosDaProposta>({});
  const [link, setLink] = useState<string | null>(null);

  function mudar(campo: CampoDaProposta, valor: string) {
    setLink(null);
    setDados((atual) => {
      const novo = { ...atual, [campo]: valor };
      // Ao escolher a trilha, sugere o link do roadmap.sh dela, se o campo estiver vazio.
      if (campo === 'trilha' && !atual.roadmap) novo.roadmap = trilhas.find((t) => t.codigo === valor)?.roadmaps[0]?.url ?? '';
      return novo;
    });
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const resultado = validarProposta(
      dados,
      trilhas.map((t) => t.codigo),
    );
    if (!resultado.ok) {
      setErros(resultado.erros);
      setLink(null);
      // O foco vai para o primeiro campo com erro, que tem a mensagem ligada a ele.
      const primeiro = ORDEM.find((c) => resultado.erros[c]);
      if (primeiro) formulario.current?.querySelector<HTMLElement>(`#proposta-${primeiro}`)?.focus();
      return;
    }
    setErros({});
    setLink(linkDaIssue(resultado.proposta));
  }

  return (
    <section className="faixa proposta" aria-labelledby="titulo-proposta">
      <p className="voltar">
        <Link to="/">Voltar ao painel</Link>
      </p>
      <h2 id="titulo-proposta" tabIndex={-1} ref={titulo}>
        Propor item
      </h2>
      <p>
        Achou um tópico do roadmap.sh sem item no catálogo? Escreva a tarefa prática com palavras suas. O painel monta o
        link da issue no modelo "Novo item"; nada é enviado daqui.
      </p>
      <form ref={formulario} noValidate onSubmit={enviar} aria-label="Propor item">
        <Campo campo="trilha" rotulo="Trilha do catálogo" dica="A trilha em que o item entra." erro={erros.trilha}>
          {(a) => (
            <select {...a} value={dados.trilha} onChange={(e) => mudar('trilha', e.target.value)}>
              <option value="">Escolha a trilha</option>
              {trilhas.map((t) => (
                <option key={t.codigo} value={t.codigo}>{`${t.codigo} · ${t.nome}`}</option>
              ))}
            </select>
          )}
        </Campo>
        <Campo campo="roadmap" rotulo="Trilha do roadmap.sh (link)" dica="Por exemplo, https://roadmap.sh/react." erro={erros.roadmap}>
          {(a) => <input {...a} type="url" value={dados.roadmap} onChange={(e) => mudar('roadmap', e.target.value)} />}
        </Campo>
        <Campo campo="topico" rotulo="Nome do tópico no roadmap.sh" dica="Só o nome, sem copiar o texto do site." erro={erros.topico}>
          {(a) => <input {...a} type="text" value={dados.topico} onChange={(e) => mudar('topico', e.target.value)} />}
        </Campo>
        <Campo campo="tarefa" rotulo="Tarefa no painel" dica="O que fazer no Painel de Formação, com palavras suas." erro={erros.tarefa}>
          {(a) => <textarea {...a} rows={3} value={dados.tarefa} onChange={(e) => mudar('tarefa', e.target.value)} />}
        </Campo>
        <Campo campo="criterios" rotulo="Critérios de entrega" dica="De 3 a 5, verificáveis, um por linha." erro={erros.criterios}>
          {(a) => <textarea {...a} rows={5} value={dados.criterios} onChange={(e) => mudar('criterios', e.target.value)} />}
        </Campo>
        <p>
          <button type="submit" className="botao">
            Montar o link da issue
          </button>
        </p>
      </form>
      <div role="status">
        {link && (
          <p>
            Pronto. <a href={link}>Abrir a issue no GitHub</a> (o GitHub pede para entrar na conta antes de criar).
          </p>
        )}
      </div>
    </section>
  );
}
