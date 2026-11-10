// T2.5: botão de tema. aria-pressed="true" quer dizer tema escuro ligado.
// T4.8: o tema vem do estado compartilhado (PreferenciasProvider).
import { useAcoesDePreferencias, usePreferencias } from '../estado/usePreferencias';
import { temaEmUso } from '../estado/preferencias';

export function BotaoTema() {
  const preferencias = usePreferencias();
  const despachar = useAcoesDePreferencias();
  return (
    <button
      type="button"
      className="botao-tema"
      aria-pressed={temaEmUso(preferencias) === 'escuro'}
      onClick={() => despachar({ tipo: 'trocar-tema' })}
    >
      Tema escuro
    </button>
  );
}
