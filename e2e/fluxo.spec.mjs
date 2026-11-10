// T7.1: o fluxo principal, como uma pessoa faria: abrir, filtrar, ver o detalhe e voltar.
// Só papéis e nomes acessíveis; nada de classe CSS.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { lerCatalogo } from '../scripts/catalogo.mjs';

const { trilhas } = lerCatalogo(readFileSync(new URL('../CATALOGO.md', import.meta.url), 'utf8'));
const t3 = trilhas.find((t) => t.codigo === 'T3');
const t3AFazer = t3.itens.filter((i) => !i.feito);
const todos = trilhas.flatMap((t) => t.itens).length;

test('T7.1: abrir o painel, filtrar, ver o detalhe da trilha e voltar', async ({ page }) => {
  // Abrir: o painel mostra o progresso do catálogo e as trilhas.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Painel de Formação' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progresso do catálogo' })).toBeVisible();
  const secaoTrilhas = page.getByRole('region', { name: 'Trilhas' });
  await expect(secaoTrilhas.getByRole('listitem')).toHaveCount(trilhas.length);

  // Filtrar: trilha T3, só o que falta fazer.
  const secaoItens = page.getByRole('region', { name: 'Itens' });
  await secaoItens.getByLabel('Trilha', { exact: true }).selectOption({ label: `T3 · ${t3.nome}` });
  await secaoItens.getByLabel('Situação', { exact: true }).selectOption({ label: 'A fazer' });
  await expect(page.getByText(`Mostrando ${t3AFazer.length} de ${todos} itens.`)).toBeVisible();
  const lista = secaoItens.getByRole('region', { name: `T3 ${t3.nome}` }).getByRole('listitem');
  await expect(lista).toHaveCount(t3AFazer.length);
  for (const situacao of await lista.getByText('Feito', { exact: true }).all()) await expect(situacao).toBeHidden();

  // Ver o detalhe: o nome da trilha leva à página dela.
  await secaoTrilhas.getByRole('link', { name: `T3 ${t3.nome}` }).click();
  const titulo = page.getByRole('heading', { level: 2, name: `T3 ${t3.nome}` });
  await expect(titulo).toBeFocused();
  await expect(page.getByRole('progressbar', { name: `T3 ${t3.nome}` })).toHaveAttribute('aria-valuemax', String(t3.itens.length));
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(t3.itens.length);
  await expect(page.getByText(t3.itens[0].codigo, { exact: true })).toBeVisible();

  // Voltar: o navegador devolve o painel com o mesmo filtro.
  await page.goBack();
  await expect(page.getByRole('heading', { level: 2, name: 'Trilhas' })).toBeFocused();
  await expect(secaoItens.getByLabel('Trilha', { exact: true })).toHaveValue('T3');
  await expect(secaoItens.getByLabel('Situação', { exact: true })).toHaveValue('a-fazer');
  await expect(lista).toHaveCount(t3AFazer.length);
});
