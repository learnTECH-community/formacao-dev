// T3.5: carregamento, falha de rede com nova tentativa e catálogo vazio.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { abrir } from './apoio.mjs';

const CATALOGO = '**/CATALOGO.md';

test('T3.5: enquanto busca, diz que está carregando (aria-busy e texto)', async ({ page }) => {
  let liberar;
  const espera = new Promise((r) => (liberar = r));
  await page.route(CATALOGO, async (rota) => {
    await espera;
    await rota.continue();
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Carregando o catálogo…');
  await expect(page.locator('#trilhas')).toHaveAttribute('aria-busy', 'true');
  liberar();
  await expect(page.locator('#lista-trilhas > li').first()).toBeVisible();
  await expect(page.locator('#trilhas')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('status')).toBeEmpty();
});

test('T3.5: falha de rede mostra a mensagem e "Tentar de novo" carrega o catálogo', async ({ page }) => {
  await page.route(CATALOGO, (rota) => rota.abort('internetdisconnected'));
  await page.goto('/');
  const alerta = page.getByRole('alert');
  await expect(alerta).toContainText('Não foi possível carregar o catálogo.');
  await expect(alerta).toContainText('Confira a conexão.');
  await expect(page.locator('#lista-trilhas > li')).toHaveCount(0);
  await expect(page.getByLabel('Trilha', { exact: true })).toBeDisabled(); // sem catálogo, sem filtro
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);

  await page.unroute(CATALOGO);
  const botao = page.getByRole('button', { name: 'Tentar de novo' });
  await botao.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#lista-trilhas > li').first()).toBeVisible();
  await expect(page.getByRole('alert')).toBeEmpty();
  // O foco vai para o título das trilhas, visível, e não cai no body nem num aviso vazio.
  await expect(page.getByRole('heading', { name: 'Trilhas', level: 2 })).toBeFocused();
  await expect(page.getByLabel('Trilha', { exact: true })).toBeEnabled();
});

test('T3.5: erro do servidor (HTTP 500) diz o código', async ({ page }) => {
  await page.route(CATALOGO, (rota) => rota.fulfill({ status: 500, body: 'erro' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('HTTP 500');
});

test('T3.5: catálogo sem itens mostra o aviso de vazio', async ({ page }) => {
  await page.route(CATALOGO, (rota) =>
    rota.fulfill({ status: 200, contentType: 'text/markdown', body: '# Catálogo de formação\n\n## T0 · Fundamentos\n' }),
  );
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('O catálogo ainda não tem itens.');
  await expect(page.locator('#lista-itens .item')).toHaveCount(0);
});

test('T3.5: com o catálogo carregado, não sobra aviso na tela', async ({ page }) => {
  await abrir(page);
  await expect(page.getByRole('status')).toBeEmpty();
  await expect(page.getByRole('alert')).toBeEmpty();
  await expect(page.locator('#estado')).toBeHidden();
});
