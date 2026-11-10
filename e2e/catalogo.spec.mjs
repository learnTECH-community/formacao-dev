// T3.1 e T3.2: o painel lê o CATALOGO.md e mostra o progresso calculado.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { abrir } from './apoio.mjs';
import { lerCatalogo, progresso } from '../scripts/catalogo.mjs';

const { trilhas } = lerCatalogo(readFileSync(new URL('../CATALOGO.md', import.meta.url), 'utf8'));
const total = progresso(trilhas);

test('T3.1: mostra todas as trilhas e todos os itens do CATALOGO.md', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#lista-trilhas > li')).toHaveCount(trilhas.length);
  await expect(page.locator('#lista-itens .item')).toHaveCount(total.total);
  const primeiro = trilhas[0].itens[0];
  const linha = page.locator('#lista-itens .item').first();
  await expect(linha.locator('.codigo-item')).toHaveText(primeiro.codigo);
  await expect(linha.locator('.situacao')).toHaveText(primeiro.feito ? 'Feito' : 'A fazer');
});

test('T3.1: o texto entre crases vira código, sem virar HTML', async ({ page }) => {
  await abrir(page);
  const item = page.locator('#lista-itens .item', { hasText: 'docs/MVP.md' }).first();
  await expect(item.locator('code')).toHaveText('docs/MVP.md');
});

test('T3.2: a barra do total e a de cada trilha usam o progresso calculado', async ({ page }) => {
  await abrir(page);
  const barraTotal = page.getByRole('progressbar', { name: 'Progresso do catálogo' });
  await expect(barraTotal).toHaveAttribute('aria-valuenow', String(total.feitos));
  await expect(barraTotal).toHaveAttribute('aria-valuemax', String(total.total));
  for (const t of trilhas) {
    const feitos = t.itens.filter((i) => i.feito).length;
    const barra = page.locator(`#trilha-${t.codigo.toLowerCase()} [role="progressbar"]`);
    await expect(barra).toHaveAttribute('aria-valuenow', String(feitos));
    await expect(barra).toHaveAttribute('aria-valuemax', String(t.itens.length));
  }
});
