// T7.13: nenhum pedido com erro (404 ou outro) ao carregar as páginas do painel.
import { test, expect } from '@playwright/test';

for (const caminho of ['/', '/trilha/T2', '/propor']) {
  test(`T7.13: ${caminho} carrega sem nenhum pedido com erro`, async ({ page }) => {
    const erros = [];
    page.on('response', (r) => {
      if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`);
    });
    page.on('requestfailed', (r) => erros.push(`falhou ${r.url()}`));
    await page.goto(caminho);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
    expect(erros).toEqual([]);
  });
}
