// Ponto de entrada do painel: busca o CATALOGO.md e mostra o progresso.
import { lerCatalogo } from './catalogo.js';
import { mostrarCatalogo } from './tela.js';

const alvos = {
  total: document.getElementById('total'),
  cartoes: document.getElementById('lista-trilhas'),
  itens: document.getElementById('lista-itens'),
};

async function carregar() {
  const resposta = await fetch('CATALOGO.md');
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  mostrarCatalogo(lerCatalogo(await resposta.text()), alvos);
}

carregar();
