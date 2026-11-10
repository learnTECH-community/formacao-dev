// T4.14: o detalhe da trilha é carregado sob demanda (React.lazy e Suspense).
import { test, expect } from '@playwright/test';
import { abrir, violacoesDoAxe } from './apoio.mjs';

const PEDACO = /\/assets\/DetalheTrilha-[\w-]+\.js$/;

test('T4.14: a página inicial não baixa o código do detalhe; abrir a trilha baixa', async ({ page }) => {
  const pedidos = [];
  page.on('request', (r) => pedidos.push(r.url()));
  await abrir(page);
  expect(pedidos.filter((u) => PEDACO.test(u))).toEqual([]);
  await page.getByRole('link', { name: /^T2 / }).click();
  await expect(page.getByRole('heading', { level: 2, name: /^T2 / })).toBeVisible();
  expect(pedidos.filter((u) => PEDACO.test(u))).toHaveLength(1);
});

test('T4.14: enquanto o detalhe chega, a espera é anunciada e acessível', async ({ page }) => {
  let liberar;
  const espera = new Promise((r) => (liberar = r));
  await page.route(PEDACO, async (rota) => {
    await espera;
    await rota.continue();
  });
  await abrir(page);
  await page.getByRole('link', { name: /^T2 / }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Carregando o detalhe da trilha…' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Carregando a página' })).toHaveAttribute('aria-busy', 'true');
  expect(await violacoesDoAxe(page)).toEqual([]);
  liberar();
  await expect(page.getByRole('heading', { level: 2, name: /^T2 / })).toBeVisible();
});
