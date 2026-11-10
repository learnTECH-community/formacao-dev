// T2.5: tema claro e escuro. Segue o sistema até a pessoa escolher pelo botão.
// Roda no <head> para aplicar a escolha antes de pintar a página.
(function () {
  var CHAVE = 'painel-tema';
  var raiz = document.documentElement;
  var sistema = window.matchMedia('(prefers-color-scheme: dark)');

  function guardado() {
    try {
      var valor = localStorage.getItem(CHAVE);
      return valor === 'claro' || valor === 'escuro' ? valor : null;
    } catch (erro) {
      return null; // navegação privada ou armazenamento bloqueado
    }
  }

  function guardar(valor) {
    try {
      localStorage.setItem(CHAVE, valor);
    } catch (erro) {
      // sem armazenamento, a escolha vale só nesta visita
    }
  }

  function temaAtual() {
    return raiz.dataset.tema || (sistema.matches ? 'escuro' : 'claro');
  }

  var escolha = guardado();
  if (escolha) raiz.dataset.tema = escolha;

  function atualizarBotao(botao) {
    botao.setAttribute('aria-pressed', String(temaAtual() === 'escuro'));
  }

  document.addEventListener('DOMContentLoaded', function () {
    var botao = document.getElementById('botao-tema');
    if (!botao) return;
    botao.hidden = false;
    atualizarBotao(botao);
    botao.addEventListener('click', function () {
      var novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
      raiz.dataset.tema = novo;
      guardar(novo);
      atualizarBotao(botao);
    });
    sistema.addEventListener('change', function () {
      atualizarBotao(botao);
    });
  });
})();
