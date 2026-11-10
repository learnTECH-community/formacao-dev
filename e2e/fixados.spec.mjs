// T4.8: itens fixados num estado compartilhado, guardados no navegador.
import { test, expect } from '@playwright/test';
import { abrir } from './apoio.mjs';

const fixados = (page) => page.getByRole('region', { name: 'Fixados' });
const itens = (page) => page.getByRole('region', { name: 'Itens' });

test('T4.8: fixar um item mostra-o em "Fixados" e a escolha fica guardada', async ({ page }) => {
  await abrir(page);
  await expect(fixados(page)).toContainText('Nenhum item fixado.');
  const botao = itens(page).getByRole('button', { name: 'Fixar T2.3', exact: true });
  await expect(botao).toHaveAttribute('aria-pressed', 'false');
  await botao.click();
  await expect(botao).toHaveAttribute('aria-pressed', 'true');
  await expect(fixados(page).getByRole('listitem')).toHaveCount(1);
  await expect(fixados(page).getByText('T2.3', { exact: true })).toBeVisible();

  await page.reload();
  await expect(fixados(page).getByRole('listitem')).toHaveCount(1);
  // O detalhe da trilha lê o mesmo estado.
  await page.goto('/trilha/T2');
  await expect(page.getByRole('button', { name: 'Fixar T2.3', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('T4.8: desafixar e limpar os fixados', async ({ page }) => {
  await abrir(page);
  await itens(page).getByRole('button', { name: 'Fixar T1.1', exact: true }).click();
  await itens(page).getByRole('button', { name: 'Fixar T3.1', exact: true }).click();
  await expect(fixados(page).getByRole('listitem')).toHaveCount(2);
  await fixados(page).getByRole('button', { name: 'Fixar T1.1', exact: true }).click();
  await expect(fixados(page).getByRole('listitem')).toHaveCount(1);
  await fixados(page).getByRole('button', { name: 'Limpar fixados' }).click();
  await expect(fixados(page)).toContainText('Nenhum item fixado.');
});

test('T4.8: valor estranho guardado não quebra o painel', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('painel-fixados', '{quebrado'));
  await abrir(page);
  await expect(fixados(page)).toContainText('Nenhum item fixado.');
});

test('T4.8: sem armazenamento, fixar funciona nesta visita', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } });
  });
  await abrir(page);
  await itens(page).getByRole('button', { name: 'Fixar T2.1', exact: true }).click();
  await expect(fixados(page).getByRole('listitem')).toHaveCount(1);
});
