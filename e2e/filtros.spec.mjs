// T3.3: filtrar os itens por trilha e por situação.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { abrir } from './apoio.mjs';
import { lerCatalogo } from '../scripts/catalogo.mjs';

const { trilhas } = lerCatalogo(readFileSync(new URL('../CATALOGO.md', import.meta.url), 'utf8'));
const todos = trilhas.flatMap((t) => t.itens);
const feitos = todos.filter((i) => i.feito);

test('T3.3: os filtros têm rótulo e começam mostrando todos os itens', async ({ page }) => {
  await abrir(page);
  await expect(page.getByLabel('Trilha', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Situação', { exact: true })).toHaveValue('todos');
  await expect(page.locator('#lista-itens .item')).toHaveCount(todos.length);
  await expect(page.locator('#contagem')).toHaveText(`Mostrando todos os ${todos.length} itens.`);
  await expect(page.locator('#contagem')).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByLabel('Trilha', { exact: true }).locator('option')).toHaveCount(trilhas.length + 1);
});

test('T3.3: filtra por trilha, por situação e pelos dois juntos', async ({ page }) => {
  await abrir(page);
  const t2 = trilhas.find((t) => t.codigo === 'T2');
  await page.getByLabel('Trilha', { exact: true }).selectOption('T2');
  await expect(page.locator('#lista-itens .item')).toHaveCount(t2.itens.length);
  await expect(page.locator('#contagem')).toHaveText(`Mostrando ${t2.itens.length} de ${todos.length} itens.`);

  await page.getByLabel('Trilha', { exact: true }).selectOption('');
  await page.getByLabel('Situação', { exact: true }).selectOption('feitos');
  await expect(page.locator('#lista-itens .item')).toHaveCount(feitos.length);
  for (const texto of await page.locator('#lista-itens .situacao').allTextContents()) expect(texto).toBe('Feito');

  await page.getByLabel('Situação', { exact: true }).selectOption('a-fazer');
  await expect(page.locator('#lista-itens .item')).toHaveCount(todos.length - feitos.length);

  const t11 = trilhas.find((t) => t.codigo === 'T11');
  const t11Feitos = t11.itens.filter((i) => i.feito).length;
  await page.getByLabel('Trilha', { exact: true }).selectOption('T11');
  await page.getByLabel('Situação', { exact: true }).selectOption('feitos');
  await expect(page.locator('#contagem')).toHaveText(
    t11Feitos === 0 ? 'Nenhum item com esses filtros.' : `Mostrando ${t11Feitos} de ${todos.length} itens.`,
  );
  await expect(page.locator('#lista-itens .item')).toHaveCount(t11Feitos);
});

test('T3.3: filtro sem resultado diz que não há itens', async ({ page }) => {
  await page.route('**/CATALOGO.md', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'text/markdown',
      body: '## T0 · Fundamentos\nRoadmap de referência: [Linux](https://roadmap.sh/linux)\n\n- [ ] **T0.1** a fazer\n',
    }),
  );
  await abrir(page);
  await page.getByLabel('Situação', { exact: true }).selectOption('feitos');
  await expect(page.locator('#contagem')).toHaveText('Nenhum item com esses filtros.');
  await expect(page.locator('#lista-itens .item')).toHaveCount(0);
});

test('T3.3: muda os filtros só pelo teclado', async ({ page }) => {
  await abrir(page);
  await page.getByLabel('Trilha', { exact: true }).focus();
  await page.keyboard.press('ArrowDown'); // primeira trilha
  await expect(page.getByLabel('Trilha', { exact: true })).toHaveValue(trilhas[0].codigo);
  await expect(page.locator('#lista-itens .item')).toHaveCount(trilhas[0].itens.length);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Situação', { exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown'); // feitos
  await page.keyboard.press('ArrowDown'); // a fazer
  await expect(page.getByLabel('Situação', { exact: true })).toHaveValue('a-fazer');
  const aFazer = trilhas[0].itens.filter((i) => !i.feito).length;
  await expect(page.locator('#lista-itens .item')).toHaveCount(aFazer);
});

test('T3.3: o axe não acusa violação com filtro aplicado', async ({ page }) => {
  await abrir(page);
  await page.getByLabel('Situação', { exact: true }).selectOption('a-fazer');
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
});
