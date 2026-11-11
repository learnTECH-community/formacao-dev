// T7.14: a página não pula quando o catálogo chega (CLS), não baixa fontes e não tem
// imagem sem dimensões.
import { test, expect } from '@playwright/test';

/** Soma os deslocamentos de layout (sem os que vêm logo depois de uma ação da pessoa). */
async function observarCLS(page) {
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

for (const largura of [412, 1440]) {
  test(`T7.14: CLS abaixo de 0,1 com o catálogo chegando devagar (${largura} px)`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await observarCLS(page);
    await page.route('**/CATALOGO.md', async (rota) => {
      await new Promise((r) => setTimeout(r, 800)); // a página pinta antes do catálogo
      await rota.continue();
    });
    await page.goto('/');
    await expect(page.locator('#lista-trilhas > li').first()).toBeVisible();
    await page.waitForTimeout(300);
    const cls = await page.evaluate(() => window.__cls);
    expect(cls).toBeLessThan(0.1);
  });
}

test('T7.14: o painel não baixa fonte e toda imagem tem largura e altura', async ({ page }) => {
  const fontes = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'font') fontes.push(r.url());
  });
  await page.goto('/');
  await expect(page.locator('#lista-trilhas > li').first()).toBeVisible();
  expect(fontes).toEqual([]); // fonte do sistema (system-ui): nada de WOFF2 para baixar
  const semDimensao = await page.locator('img:not([width]), img:not([height])').count();
  expect(semDimensao).toBe(0);
});
