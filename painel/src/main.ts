// Ponto de entrada do painel: busca o CATALOGO.md e mostra o progresso.
// T3.5: diz quando está carregando, quando falhou (com nova tentativa) e quando veio vazio.
import { lerCatalogo } from './catalogo';
import { ehSituacao, filtrarItens, textoDaContagem } from './filtro';
import { el, criarGrupo, mostrarCatalogo, type Alvos } from './tela';
import type { Trilha } from './tipos';

/** Busca um elemento pelo id e confere o tipo; falha cedo se o HTML mudar. */
function pegar<T extends HTMLElement>(id: string, tipo: new () => T): T {
  const elemento = document.getElementById(id);
  if (!(elemento instanceof tipo)) throw new Error(`Elemento #${id} não encontrado ou de outro tipo`);
  return elemento;
}

const estado = pegar('estado', HTMLDivElement);
const avisoStatus = pegar('aviso-status', HTMLParagraphElement);
const avisoErro = pegar('aviso-erro', HTMLDivElement);
const tituloTrilhas = pegar('titulo-trilhas', HTMLHeadingElement);
const alvos: Alvos = {
  total: pegar('total', HTMLDivElement),
  cartoes: pegar('lista-trilhas', HTMLOListElement),
  itens: pegar('lista-itens', HTMLDivElement),
};
const filtros = {
  form: pegar('filtros', HTMLFormElement),
  trilha: pegar('filtro-trilha', HTMLSelectElement),
  situacao: pegar('filtro-situacao', HTMLSelectElement),
  contagem: pegar('contagem', HTMLParagraphElement),
};
/** Catálogo carregado; o filtro trabalha sobre ele, sem buscar de novo. */
let catalogo: Trilha[] = [];

const ocupaveis: HTMLElement[] = [pegar('trilhas', HTMLElement), pegar('itens', HTMLElement), alvos.total];

function ocupado(sim: boolean): void {
  for (const regiao of ocupaveis) regiao.setAttribute('aria-busy', String(sim));
}

function limparCatalogo(): void {
  for (const alvo of Object.values(alvos)) alvo.replaceChildren();
  filtros.contagem.textContent = '';
}

/** Sem catálogo carregado, os filtros ficam desligados: não há o que filtrar. */
function filtrosLigados(sim: boolean): void {
  filtros.trilha.disabled = !sim;
  filtros.situacao.disabled = !sim;
}

/** Troca só o texto das regiões de aviso, que ficam sempre na página. */
function avisar(status: string, erro: (Node | string)[] = []): void {
  avisoStatus.textContent = status;
  avisoErro.replaceChildren(...erro);
}

/** T3.3: mostra só os itens que passam no filtro e diz quantos aparecem. */
function aplicarFiltro(): void {
  const valor = filtros.situacao.value;
  const situacao = ehSituacao(valor) ? valor : 'todos';
  const visiveis = filtrarItens(catalogo, { trilha: filtros.trilha.value, situacao });
  alvos.itens.replaceChildren(...visiveis.map((t) => criarGrupo(t)));
  const total = catalogo.flatMap((t) => t.itens).length;
  filtros.contagem.textContent = textoDaContagem(visiveis.flatMap((t) => t.itens).length, total);
}

function prepararFiltro(): void {
  const escolhida = filtros.trilha.value;
  filtros.trilha.replaceChildren(
    el('option', { value: '' }, ['Todas as trilhas']),
    ...catalogo.map((t) => el('option', { value: t.codigo }, [`${t.codigo} · ${t.nome}`])),
  );
  if (catalogo.some((t) => t.codigo === escolhida)) filtros.trilha.value = escolhida;
  aplicarFiltro();
}

filtros.form.addEventListener('change', aplicarFiltro);
filtros.form.addEventListener('submit', (evento) => evento.preventDefault());

/** Mensagem curta para a pessoa, sem detalhe técnico demais. */
function mensagemDeErro(erro: unknown): string {
  if (erro instanceof TypeError) return 'Não conseguimos falar com o servidor. Confira a conexão.';
  const detalhe = erro instanceof Error ? erro.message : String(erro);
  return `O servidor respondeu com erro (${detalhe}).`;
}

function mostrarCarregando(): void {
  avisar('Carregando o catálogo…');
}

function mostrarErro(erro: unknown): void {
  const botao = el('button', { type: 'button', class: 'botao' }, ['Tentar de novo']);
  botao.addEventListener('click', () => {
    estado.focus(); // o botão some durante a nova tentativa; o foco não se perde
    void carregar({ levarFoco: true });
  });
  avisar('', [
    el('p', {}, [el('strong', {}, ['Não foi possível carregar o catálogo.']), ` ${mensagemDeErro(erro)}`]),
    el('p', {}, [botao]),
  ]);
}

function mostrarVazio(): void {
  avisar('O catálogo ainda não tem itens. Proponha o primeiro com o modelo "Novo item" no GitHub.');
}

async function carregar({ levarFoco = false } = {}): Promise<void> {
  ocupado(true);
  filtrosLigados(false);
  limparCatalogo();
  mostrarCarregando();
  try {
    const resposta = await fetch('CATALOGO.md', { cache: 'no-cache' });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const trilhas = lerCatalogo(await resposta.text());
    if (trilhas.flatMap((t) => t.itens).length === 0) {
      mostrarVazio();
      return;
    }
    catalogo = trilhas;
    mostrarCatalogo(trilhas, alvos);
    prepararFiltro();
    filtrosLigados(true);
    avisar('');
    // Depois de "Tentar de novo", o foco vai para o começo do catálogo, que agora está na tela.
    if (levarFoco) tituloTrilhas.focus();
  } catch (erro) {
    mostrarErro(erro);
  } finally {
    ocupado(false);
  }
}

void carregar();
