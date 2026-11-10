// Apoio aos testes do painel no navegador.
import { expect } from '@playwright/test';

/** Abre o painel e espera o catálogo aparecer na tela. */
export async function abrir(page, caminho = '/') {
  await page.goto(caminho);
  await expect(page.locator('#lista-trilhas > li').first()).toBeVisible();
}
