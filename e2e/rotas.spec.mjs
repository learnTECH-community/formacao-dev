// T4.2: filtro no endereço. T4.3: página de detalhe da trilha com rota própria.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { abrir } from './apoio.mjs';
import { lerCatalogo } from '../scripts/catalogo.mjs';

const { trilhas } = lerCatalogo(readFileSync(new URL('../CATALOGO.md', import.meta.url), 'utf8'));
const t2 = trilhas.find((t) => t.codigo === 'T2');
const t2Feitos = t2.itens.filter((i) => i.feito).length;
const todos = trilhas.flatMap((t) => t.itens).length;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const violacoes = async (page) =>
  (await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => `${v.id}: ${v.nodes.length}`);

const trilha = (page) => page.getByLabel('Trilha', { exact: true });
const situacao = (page) => page.getByLabel('Situação', { exact: true });
const itens = (page) => page.locator('#lista-itens li');

test.describe('T4.2: filtro no endereço', () => {
  test('mudar o filtro atualiza o endereço sem recarregar a página', async ({ page }) => {
    await abrir(page);
    await page.evaluate(() => (window.semRecarregar = true));
    await trilha(page).selectOption('T2');
    await expect(page).toHaveURL(/\/\?trilha=T2$/);
    await situacao(page).selectOption('feitos');
    await expect(page).toHaveURL(/\/\?trilha=T2&situacao=feitos$/);
    expect(await page.evaluate(() => window.semRecarregar)).toBe(true);
  });

  test('abrir um endereço com filtro mostra a lista já filtrada', async ({ page }) => {
    await abrir(page, '/?trilha=T2&situacao=feitos');
    await expect(trilha(page)).toHaveValue('T2');
    await expect(situacao(page)).toHaveValue('feitos');
    await expect(itens(page)).toHaveCount(t2Feitos);
  });

  test('Voltar e Avançar do navegador restauram o filtro', async ({ page }) => {
    await abrir(page);
    await trilha(page).selectOption('T2');
    await situacao(page).selectOption('a-fazer');
    await page.goBack();
    await expect(situacao(page)).toHaveValue('todos');
    await expect(trilha(page)).toHaveValue('T2');
    await expect(itens(page)).toHaveCount(t2.itens.length);
    await page.goBack();
    await expect(trilha(page)).toHaveValue('');
    await expect(itens(page)).toHaveCount(todos);
    await page.goForward();
    await expect(trilha(page)).toHaveValue('T2');
  });

  test('valor inválido no endereço cai no padrão, sem erro', async ({ page }) => {
    await abrir(page, '/?trilha=T99&situacao=qualquer');
    await expect(trilha(page)).toHaveValue('');
    await expect(situacao(page)).toHaveValue('todos');
    await expect(itens(page)).toHaveCount(todos);
    await expect(page.getByRole('alert')).toBeEmpty();
  });
});

test.describe('T4.3: detalhe da trilha', () => {
  test('o cartão leva ao detalhe; o título da aba muda e o foco vai para o título', async ({ page }) => {
    await abrir(page);
    await page.getByRole('link', { name: 'T2 Frontend base' }).click();
    await expect(page).toHaveURL(/\/trilha\/T2$/);
    const titulo = page.getByRole('heading', { level: 2, name: 'T2 Frontend base' });
    await expect(titulo).toBeFocused();
    await expect(page).toHaveTitle('T2 Frontend base · Painel de Formação · learnTECH Community');
    await expect(page.getByRole('progressbar', { name: 'T2 Frontend base' })).toHaveAttribute('aria-valuemax', String(t2.itens.length));
    await expect(page.locator('main a[href^="https://roadmap.sh/"]').first()).toBeVisible();
    await expect(page.locator('.detalhe li')).toHaveCount(t2.itens.length);

    await page.getByRole('link', { name: 'Voltar ao painel' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Trilhas' })).toBeFocused();
    await expect(page).toHaveTitle('Painel de Formação · learnTECH Community');
  });

  test('abrir o endereço direto e recarregar mostram o detalhe', async ({ page }) => {
    await page.goto('/trilha/T2');
    await expect(page.getByRole('heading', { level: 2, name: 'T2 Frontend base' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 2, name: 'T2 Frontend base' })).toBeVisible();
    await expect(page.locator('.detalhe li')).toHaveCount(t2.itens.length);
    expect(await violacoes(page)).toEqual([]);
  });

  test('trilha que não existe mostra "Trilha não encontrada" com o link de volta', async ({ page }) => {
    await page.goto('/trilha/T99');
    await expect(page.getByRole('heading', { level: 2, name: 'Trilha não encontrada' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voltar ao painel' })).toBeVisible();
    await expect(page).toHaveTitle(/^Trilha não encontrada · /);
    expect(await violacoes(page)).toEqual([]);
  });

  test('o menu do topo, no detalhe, leva de volta às seções da página inicial', async ({ page }) => {
    await page.goto('/trilha/T2');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Itens' }).click();
    await expect(page).toHaveURL(/\/#itens$/);
    await expect(page.locator('#lista-itens li').first()).toBeVisible();
  });
});
