// Acesso ao localStorage que não quebra o painel: navegação privada, armazenamento
// bloqueado ou cheio viram "sem valor" ou "não guardou".

export function lerGuardado(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null; // navegação privada ou armazenamento bloqueado
  }
}

/** Guarda um valor; devolve false se o armazenamento recusou (cheio ou bloqueado). */
export function guardar(chave: string, valor: string): boolean {
  try {
    localStorage.setItem(chave, valor);
    return true;
  } catch (erro) {
    console.warn(`Não foi possível guardar "${chave}"; a escolha vale só nesta visita.`, erro);
    return false;
  }
}
