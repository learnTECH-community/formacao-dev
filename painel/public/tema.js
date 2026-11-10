// T2.5: aplica o tema guardado antes de pintar a página, para não piscar.
// Roda no <head>, antes do React. O botão de tema é um componente React (BotaoTema).
(function () {
  try {
    var valor = localStorage.getItem('painel-tema');
    if (valor === 'claro' || valor === 'escuro') document.documentElement.dataset.tema = valor;
  } catch {
    // navegação privada ou armazenamento bloqueado: segue o tema do sistema
  }
})();
