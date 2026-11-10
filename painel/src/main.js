// Ponto de entrada do painel: busca o CATALOGO.md e mostra o progresso.
// T3.5: diz quando está carregando, quando falhou (com nova tentativa) e quando veio vazio.
import { lerCatalogo } from './catalogo.js';
import { el, mostrarCatalogo } from './tela.js';

const estado = document.getElementById('estado');
const alvos = {
  total: document.getElementById('total'),
  cartoes: document.getElementById('lista-trilhas'),
  itens: document.getElementById('lista-itens'),
};
const ocupaveis = [document.getElementById('trilhas'), document.getElementById('itens'), alvos.total];

function ocupado(sim) {
  for (const regiao of ocupaveis) regiao.setAttribute('aria-busy', String(sim));
}

function limparCatalogo() {
  for (const alvo of Object.values(alvos)) alvo.replaceChildren();
}

/** Mensagem curta para a pessoa, sem detalhe técnico demais. */
function mensagemDeErro(erro) {
  if (erro instanceof TypeError) return 'Não conseguimos falar com o servidor. Confira a conexão.';
  return `O servidor respondeu com erro (${erro.message}).`;
}

function mostrarCarregando() {
  estado.replaceChildren(el('p', { class: 'aviso', role: 'status' }, ['Carregando o catálogo…']));
}

function mostrarErro(erro) {
  const botao = el('button', { type: 'button', class: 'botao' }, ['Tentar de novo']);
  botao.addEventListener('click', () => {
    estado.focus(); // o botão some durante a nova tentativa; o foco não se perde
    carregar();
  });
  estado.replaceChildren(
    el('div', { class: 'aviso aviso-erro', role: 'alert' }, [
      el('p', {}, [el('strong', {}, ['Não foi possível carregar o catálogo.']), ` ${mensagemDeErro(erro)}`]),
      el('p', {}, [botao]),
    ]),
  );
}

function mostrarVazio() {
  estado.replaceChildren(
    el('p', { class: 'aviso', role: 'status' }, [
      'O catálogo ainda não tem itens. Proponha o primeiro com o modelo "Novo item" no GitHub.',
    ]),
  );
}

async function carregar() {
  ocupado(true);
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
    mostrarCatalogo(trilhas, alvos);
    estado.replaceChildren();
  } catch (erro) {
    mostrarErro(erro);
  } finally {
    ocupado(false);
  }
}

carregar();
