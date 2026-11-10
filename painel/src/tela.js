// Monta a página a partir dos dados do catálogo. Só usa a API do DOM
// (sem innerHTML), para que nenhum texto do catálogo vire HTML.
import { pedacosDoTexto } from './catalogo.js';
import { progressoDe, progressoTotal, textoDoProgresso } from './progresso.js';

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, string>} [atributos]
 * @param {(Node | string)[]} [filhos]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function el(tag, atributos = {}, filhos = []) {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) elemento.setAttribute(nome, valor);
  elemento.append(...filhos);
  return elemento;
}

/**
 * Barra de progresso acessível (T2.3) com o texto equivalente ao lado.
 * @param {string} idDoRotulo id do elemento que dá nome à barra
 * @param {{ feitos: number, total: number, percentual: number }} progresso
 */
export function criarBarra(idDoRotulo, progresso) {
  const texto = textoDoProgresso(progresso);
  const preenchido = el('span', { class: 'preenchido' });
  preenchido.style.width = `${progresso.percentual}%`;
  return el('div', { class: 'progresso' }, [
    el(
      'div',
      {
        class: 'barra',
        role: 'progressbar',
        'aria-labelledby': idDoRotulo,
        'aria-valuemin': '0',
        'aria-valuemax': String(progresso.total),
        'aria-valuenow': String(progresso.feitos),
        'aria-valuetext': texto,
      },
      [preenchido],
    ),
    el('p', { class: 'itens' }, [texto]),
  ]);
}

/** Texto do item com os trechos entre crases em <code>. */
function textoDoItem(texto) {
  return pedacosDoTexto(texto).map((p) => (p.codigo ? el('code', {}, [p.texto]) : p.texto));
}

/** Links do roadmap.sh de uma trilha. */
function criarRoadmaps(roadmaps) {
  const filhos = ['Estudo no roadmap.sh: '];
  roadmaps.forEach((r, i) => {
    if (i > 0) filhos.push(' · ');
    filhos.push(el('a', { href: r.url }, [r.nome]));
  });
  return el('p', { class: 'roadmaps' }, filhos);
}

/** Cartão da trilha na seção "Trilhas". */
export function criarCartao(trilha) {
  const id = `nome-${trilha.codigo.toLowerCase()}`;
  return el('li', { class: 'trilha', id: `trilha-${trilha.codigo.toLowerCase()}` }, [
    el('h3', { id }, [el('span', { class: 'codigo' }, [trilha.codigo]), ` ${trilha.nome}`]),
    criarBarra(id, progressoDe(trilha.itens)),
    criarRoadmaps(trilha.roadmaps),
  ]);
}

/** Um item do catálogo, com a situação escrita (não só a cor). */
export function criarItem(item) {
  return el('li', { class: 'item', 'data-feito': String(item.feito) }, [
    el('span', { class: 'codigo-item' }, [item.codigo]),
    el('span', { class: 'texto-item' }, textoDoItem(item.texto)),
    el('span', { class: 'situacao' }, [item.feito ? 'Feito' : 'A fazer']),
  ]);
}

/** Grupo de itens de uma trilha na seção "Itens". */
export function criarGrupo(trilha, itens = trilha.itens) {
  const id = `itens-${trilha.codigo.toLowerCase()}`;
  return el('section', { class: 'grupo', 'aria-labelledby': id }, [
    el('h3', { id }, [el('span', { class: 'codigo' }, [trilha.codigo]), ` ${trilha.nome}`]),
    el('ul', { class: 'lista-itens' }, itens.map(criarItem)),
  ]);
}

/**
 * Mostra o catálogo inteiro: total no topo, cartões e itens.
 * @param {ReturnType<typeof import('./catalogo.js').lerCatalogo>} trilhas
 * @param {{ total: HTMLElement, cartoes: HTMLElement, itens: HTMLElement }} alvos
 */
export function mostrarCatalogo(trilhas, alvos) {
  alvos.total.replaceChildren(
    el('p', { class: 'total-rotulo', id: 'rotulo-total' }, ['Progresso do catálogo']),
    criarBarra('rotulo-total', progressoTotal(trilhas)),
  );
  alvos.cartoes.replaceChildren(...trilhas.map(criarCartao));
  alvos.itens.replaceChildren(...trilhas.map((t) => criarGrupo(t)));
}
