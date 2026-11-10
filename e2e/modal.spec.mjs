// T4.15: detalhe do item numa janela modal com portal, foco preso e Esc para fechar.
import { test, expect } from '@playwright/test';
import { violacoesDoAxe } from './apoio.mjs';

async function abrirDetalhe(page) {
  await page.goto('/trilha/T2');
  const botao = page.getByRole('button', { name: 'Ver detalhes de T2.3', exact: true });
  await botao.click();
  const janela = page.getByRole('dialog', { name: /^T2\.3 · / });
  await expect(janela).toBeVisible();
  return { botao, janela };
}

test('T4.15: a janela abre fora do #app (portal), com o foco dentro', async ({ page }) => {
  const { janela } = await abrirDetalhe(page);
  await expect(janela).toHaveAttribute('aria-modal', 'true');
  expect(await page.evaluate(() => document.getElementById('app').contains(document.querySelector('[role="dialog"]')))).toBe(false);
  expect(await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement))).toBe(true);
  await expect(page.locator('#app')).toHaveAttribute('inert', '');
  await expect(janela.getByRole('link', { name: 'Issues de T2.3 no GitHub' })).toBeVisible();
});

test('T4.15: o Tab e o Shift+Tab ficam presos na janela', async ({ page }) => {
  await abrirDetalhe(page);
  const dentro = () => page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement));
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dentro(), `Tab ${i + 1}`).toBe(true);
  }
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await dentro(), `Shift+Tab ${i + 1}`).toBe(true);
  }
});

test('T4.15: Esc fecha e o foco volta ao botão que abriu', async ({ page }) => {
  const { botao, janela } = await abrirDetalhe(page);
  await page.keyboard.press('Escape');
  await expect(janela).toHaveCount(0);
  await expect(botao).toBeFocused();
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '');
});

test('T4.15: o botão "Fechar" fecha e o foco volta ao botão que abriu', async ({ page }) => {
  const { botao, janela } = await abrirDetalhe(page);
  await janela.getByRole('button', { name: 'Fechar' }).click();
  await expect(janela).toHaveCount(0);
  await expect(botao).toBeFocused();
});

test('T4.15: abre pelo teclado e o axe não acusa violação com a janela aberta', async ({ page }) => {
  await page.goto('/trilha/T2');
  await page.getByRole('button', { name: 'Ver detalhes de T2.1', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await violacoesDoAxe(page)).toEqual([]);
});
