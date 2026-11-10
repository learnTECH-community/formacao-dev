// T2.5: botão de tema. aria-pressed="true" quer dizer tema escuro ligado.
import { useEffect, useState } from 'react';
import { aplicarTema, guardarTema, ouvirTemaDoSistema, temaAtual } from '../tema';

export function BotaoTema() {
  const [escuro, setEscuro] = useState(() => temaAtual() === 'escuro');

  // Sem escolha guardada, o tema segue o sistema; o botão acompanha.
  useEffect(() => ouvirTemaDoSistema(() => setEscuro(temaAtual() === 'escuro')), []);

  function trocar() {
    const novo = escuro ? 'claro' : 'escuro';
    aplicarTema(novo);
    guardarTema(novo);
    setEscuro(!escuro);
  }

  return (
    <button type="button" className="botao-tema" aria-pressed={escuro} onClick={trocar}>
      Tema escuro
    </button>
  );
}
