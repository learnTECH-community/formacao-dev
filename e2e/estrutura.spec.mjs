// T2.1 e T2.2: estrutura semântica e página responsiva.
import { test, expect } from '@playwright/test';

test('T2.1: tem cabeçalho, navegação, conteúdo principal, rodapé e um só h1', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('footer')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Painel de Formação');
});

test('T2.1: as 12 trilhas aparecem em lista, cada uma com link do roadmap.sh', async ({ page }) => {
  await page.goto('/');
  const trilhas = page.locator('#trilhas ol > li');
  await expect(trilhas).toHaveCount(12);
  for (const trilha of await trilhas.all()) {
    await expect(trilha.getByRole('heading', { level: 3 })).not.toBeEmpty();
    expect(await trilha.locator('a[href^="https://roadmap.sh/"]').count()).toBeGreaterThan(0);
  }
});

for (const largura of [320, 768, 1440]) {
  test(`T2.2: sem rolagem lateral em ${largura} px`, async ({ page }, info) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto('/');
    const { rolagem, janela } = await page.evaluate(() => ({
      rolagem: document.documentElement.scrollWidth,
      janela: document.documentElement.clientWidth,
    }));
    expect(rolagem).toBeLessThanOrEqual(janela);
    await page.screenshot({ path: info.outputPath(`painel-${largura}.png`), fullPage: true });
  });
}

test('T2.2: nenhum texto menor que 16 px no celular', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  const menores = await page.evaluate(() => {
    const achados = [];
    const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (andar.nextNode()) {
      const no = andar.currentNode;
      if (!no.textContent.trim()) continue;
      const tamanho = parseFloat(getComputedStyle(no.parentElement).fontSize);
      if (tamanho < 16) achados.push(`${no.parentElement.tagName}: ${tamanho}px`);
    }
    return achados;
  });
  expect(menores).toEqual([]);
});
