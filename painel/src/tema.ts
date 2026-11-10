// T2.5: tema claro e escuro. Segue o sistema até a pessoa escolher pelo botão.
// O public/tema.js aplica a escolha guardada antes da primeira pintura;
// este módulo lê e troca o tema depois que o React monta a página.

export type Tema = 'claro' | 'escuro';

const CHAVE = 'painel-tema';
const CONSULTA_ESCURO = '(prefers-color-scheme: dark)';

function ehTema(valor: unknown): valor is Tema {
  return valor === 'claro' || valor === 'escuro';
}

/** Tema guardado pela pessoa, ou null se não há escolha ou o armazenamento está bloqueado. */
export function temaGuardado(): Tema | null {
  try {
    const valor = localStorage.getItem(CHAVE);
    return ehTema(valor) ? valor : null;
  } catch {
    return null; // navegação privada ou armazenamento bloqueado
  }
}

/** Guarda a escolha; sem armazenamento, ela vale só nesta visita. */
export function guardarTema(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {
    // sem armazenamento: segue sem guardar
  }
}

export function temaDoSistema(): Tema {
  return window.matchMedia(CONSULTA_ESCURO).matches ? 'escuro' : 'claro';
}

/** O tema em uso: a escolha aplicada na página ou, sem escolha, o do sistema. */
export function temaAtual(): Tema {
  const escolhido = document.documentElement.dataset.tema;
  return ehTema(escolhido) ? escolhido : temaDoSistema();
}

/** Aplica o tema na página. */
export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema;
}

/** Avisa quando o tema do sistema muda; devolve a função que para de ouvir. */
export function ouvirTemaDoSistema(aoMudar: () => void): () => void {
  const consulta = window.matchMedia(CONSULTA_ESCURO);
  consulta.addEventListener('change', aoMudar);
  return () => consulta.removeEventListener('change', aoMudar);
}
