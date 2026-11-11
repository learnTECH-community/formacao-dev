// T4.12: formulário "Propor item" no navegador: erros acessíveis e o link do GitHub.
import { test, expect } from '@playwright/test';
import { abrir, violacoesDoAxe } from './apoio.mjs';

test('T4.12: com erros, o axe não acusa violação e o foco vai ao primeiro campo', async ({ page }) => {
  await abrir(page);
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Propor item' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Propor item' })).toBeFocused();
  await page.getByRole('button', { name: 'Montar o link da issue' }).click();
  await expect(page.getByLabel('Trilha do catálogo')).toBeFocused();
  await expect(page.getByText('Escreva de 3 a 5 critérios, um por linha.')).toBeVisible();
  expect(await violacoesDoAxe(page)).toEqual([]);
});

test('T4.12: proposta válida vira um link para o modelo "Novo item", sem pedido a outro lugar', async ({ page }) => {
  const pedidos = [];
  page.on('request', (r) => pedidos.push(new URL(r.url()).host));
  await page.goto('/propor');
  await page.getByLabel('Trilha do catálogo').selectOption('T4');
  await page.getByLabel('Nome do tópico no roadmap.sh').fill('Testing');
  await page.getByLabel('Tarefa no painel').fill('Testar os componentes do painel com Testing Library.');
  await page.getByLabel('Critérios de entrega').fill('Usa getByRole\nUsa user-event\nRoda no CI');
  await page.getByRole('button', { name: 'Montar o link da issue' }).click();
  const link = page.getByRole('link', { name: 'Abrir a issue no GitHub' });
  await expect(link).toHaveAttribute('href', /^https:\/\/github\.com\/learnTECH-community\/formacao-dev\/issues\/new\?template=novo-item\.yml&/);
  expect(new Set(pedidos)).toEqual(new Set(['127.0.0.1:' + new URL(page.url()).port]));
  expect(await violacoesDoAxe(page)).toEqual([]);
});
