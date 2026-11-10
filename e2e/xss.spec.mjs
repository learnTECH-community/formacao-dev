// T10.7: título de item com HTML ou script aparece como texto; nada é executado.
// O catálogo de teste é fictício e entra no lugar do CATALOGO.md real.
import { test, expect } from '@playwright/test';

const SCRIPT = '<script>window.__xss = "script"</script>';
const IMAGEM = '<img src="x" onerror="window.__xss = \'img\'">';
const LINK = '<a href="javascript:window.__xss=\'link\'">clique</a>';

const CATALOGO_COM_ATAQUE = [
  '# Catálogo de formação',
  '',
  '**Progresso:** 0 de 3 itens',
  '',
  '## T1 · Trilha de teste',
  '',
  `- [ ] **T1.1** Item com ${SCRIPT} no título.`,
  `- [ ] **T1.2** Item com ${IMAGEM} no título.`,
  `- [ ] **T1.3** Item com ${LINK} e \`${SCRIPT}\` entre crases.`,
  '',
].join('\n');

test('T10.7: HTML e script no título de um item aparecem como texto e não rodam', async ({ page }) => {
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/CATALOGO.md', (rota) => rota.fulfill({ contentType: 'text/markdown; charset=utf-8', body: CATALOGO_COM_ATAQUE }));
  await page.goto('/');
  await expect(page.locator('#lista-trilhas > li').first()).toBeVisible();
  const lista = page.getByRole('main');
  await expect(lista.getByText(SCRIPT, { exact: false }).first()).toBeVisible();
  await expect(lista.getByText(IMAGEM, { exact: false })).toBeVisible();
  await expect(lista.getByText(LINK, { exact: false })).toBeVisible();
  // Nenhum elemento foi criado a partir do texto do catálogo.
  await expect(lista.locator('script, img, a[href^="javascript:"]')).toHaveCount(0);
  // Nada rodou: a variável que o ataque criaria não existe.
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  expect(erros).toEqual([]);
});
