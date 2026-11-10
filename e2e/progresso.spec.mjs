// T2.3: barra de progresso que leitores de tela entendem.
import { test, expect } from '@playwright/test';
import { abrir } from './apoio.mjs';

test('T2.3: cada trilha tem uma barra com nome, valores e texto visível equivalente', async ({ page }) => {
  await abrir(page);
  const trilhas = page.locator('#trilhas ol > li');
  await expect(trilhas).toHaveCount(12);
  for (const trilha of await trilhas.all()) {
    const nome = (await trilha.getByRole('heading', { level: 3 }).innerText()).replace(/\s+/g, ' ').trim();
    const barra = trilha.getByRole('progressbar', { name: nome });
    await expect(barra).toHaveCount(1);
    const [min, max, agora, texto] = await Promise.all(
      ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext'].map((a) => barra.getAttribute(a)),
    );
    expect(Number(min)).toBe(0);
    expect(Number(agora)).toBeGreaterThanOrEqual(0);
    expect(Number(agora)).toBeLessThanOrEqual(Number(max));
    expect(texto).toBe(`${agora} de ${max} itens`);
    await expect(trilha.getByText(texto, { exact: true })).toBeVisible();
  }
});

test('T2.3: a árvore de acessibilidade lê a barra com nome e valor', async ({ page }) => {
  await abrir(page);
  const arvore = await page.locator('#trilha-t2').ariaSnapshot();
  expect(arvore).toMatch(/progressbar "T2 Frontend base"/);
});
