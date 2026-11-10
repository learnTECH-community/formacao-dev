// Apoio aos testes do painel no navegador.
import { expect } from '@playwright/test';

/** Abre o painel e espera o catálogo aparecer na tela. */
export async function abrir(page, caminho = '/') {
  await page.goto(caminho);
  await expect(page.locator('#lista-trilhas > li').first()).toBeVisible();
}

/** Regras WCAG 2.1 A e AA conferidas pelo axe em todas as telas. */
export const REGRAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Roda o axe e devolve as violações como "regra: N elementos", para a falha ser legível. */
export async function violacoesDoAxe(page) {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const { violations } = await new AxeBuilder({ page }).withTags(REGRAS_WCAG).analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes.length === 1 ? 'elemento' : 'elementos'}`);
}
