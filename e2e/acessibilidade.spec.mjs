// T2.4 e T2.6: contraste, foco visível e navegação só pelo teclado.
import { test, expect } from '@playwright/test';
import { abrir } from './apoio.mjs';
import AxeBuilder from '@axe-core/playwright';

const semTransicao = '*, *::before, *::after { transition: none !important; }';

/** Elementos que recebem foco pelo Tab, na ordem do documento, numerados. */
async function focaveis(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
      .filter((el) => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length > 0)
      .map((el, i) => {
        el.dataset.ordem = String(i);
        return `${i}: ${el.tagName.toLowerCase()} ${el.textContent.trim().slice(0, 30)}`;
      }),
  );
}

/** O elemento com foco, no mesmo formato de focaveis(), ou "body". */
async function atual(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'body';
    return `${el.dataset.ordem}: ${el.tagName.toLowerCase()} ${el.textContent.trim().slice(0, 30)}`;
  });
}

for (const largura of [1440, 320]) {
  test(`T2.4: o axe não acusa violação (WCAG A e AA) em ${largura} px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await abrir(page);
    const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}

test('T2.4: todo link e botão mostra o foco ao navegar com Tab', async ({ page }) => {
  await abrir(page);
  await page.addStyleTag({ content: semTransicao });
  const total = (await focaveis(page)).length;
  expect(total).toBeGreaterThan(10);
  for (let i = 0; i < total; i++) {
    await page.keyboard.press('Tab');
    const contorno = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement);
      return { estilo: s.outlineStyle, largura: parseFloat(s.outlineWidth), cor: s.outlineColor, el: document.activeElement.tagName };
    });
    expect(contorno.estilo, `foco ${i + 1} (${contorno.el})`).not.toBe('none');
    expect(contorno.largura).toBeGreaterThanOrEqual(2);
  }
});

test('T2.6: o primeiro Tab vai para "Pular para o conteúdo", que leva ao conteúdo principal', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Tab');
  const pular = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(pular).toBeFocused();
  await expect(pular).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.querySelector('main').contains(document.activeElement))).toBe(true);
});

test('T2.6: a ordem do Tab segue a ordem do documento e a ordem visual', async ({ page }) => {
  await abrir(page);
  const esperado = await focaveis(page);
  const visitados = [];
  for (let i = 0; i < esperado.length; i++) {
    await page.keyboard.press('Tab');
    visitados.push(await atual(page));
  }
  expect(visitados).toEqual(esperado);
  // Nada muda a ordem: sem tabindex positivo e sem "order" do CSS.
  const mudaOrdem = await page.evaluate(() =>
    [...document.querySelectorAll('*')].filter(
      (el) => el.tabIndex > 0 || (getComputedStyle(el).order !== '0') || /reverse/.test(getComputedStyle(el).flexDirection),
    ).length,
  );
  expect(mudaOrdem).toBe(0);
  // Os cartões das trilhas seguem a leitura: linha a linha, da esquerda para a direita.
  const caixas = await page.locator('#trilhas ol > li').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y })));
  for (let i = 1; i < caixas.length; i++) {
    const [a, b] = [caixas[i - 1], caixas[i]];
    expect(b.y > a.y + 1 || (Math.abs(b.y - a.y) <= 1 && b.x > a.x)).toBe(true);
  }
});

test('T2.6: nenhum controle prende o foco; o Tab percorre tudo e sai da página', async ({ page }) => {
  await abrir(page);
  const total = (await focaveis(page)).length;
  const vistos = new Set();
  for (let i = 0; i < total; i++) {
    await page.keyboard.press('Tab');
    vistos.add(await atual(page));
  }
  expect(vistos.size).toBe(total);
  await page.keyboard.press('Tab');
  expect(await atual(page)).toBe('body'); // passou do último controle e saiu para o navegador
  // E de volta com Shift+Tab, sem ficar preso.
  await page.keyboard.press('Shift+Tab');
  expect(await atual(page)).not.toBe('body');
});
