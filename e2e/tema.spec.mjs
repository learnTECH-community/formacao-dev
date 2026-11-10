// T2.5: tema claro e escuro, que segue o sistema e pode ser trocado por um botão.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const fundo = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const axe = (page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

test('T2.5: as cores ficam em variáveis no :root', async ({ page }) => {
  await page.goto('/');
  const vars = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return ['--fundo', '--texto', '--link', '--foco'].map((v) => s.getPropertyValue(v).trim());
  });
  for (const v of vars) expect(v).toMatch(/^#[0-9a-f]{6}$/i);
});

test('T2.5: o tema segue a preferência do sistema', async ({ page }, info) => {
  await page.goto('/');
  const escuro = info.project.name === 'escuro';
  expect(await fundo(page)).toBe(escuro ? 'rgb(18, 22, 27)' : 'rgb(255, 255, 255)');
  await expect(page.getByRole('button', { name: 'Tema escuro' })).toHaveAttribute('aria-pressed', String(escuro));
});

test('T2.5: o botão troca o tema, guarda a escolha e funciona pelo teclado', async ({ page }) => {
  await page.goto('/');
  const botao = page.getByRole('button', { name: 'Tema escuro' });
  const antes = await fundo(page);
  const pressionadoAntes = await botao.getAttribute('aria-pressed');
  await botao.focus();
  await page.keyboard.press('Enter');
  expect(await fundo(page)).not.toBe(antes);
  await expect(botao).toHaveAttribute('aria-pressed', pressionadoAntes === 'true' ? 'false' : 'true');
  await page.reload();
  expect(await fundo(page)).not.toBe(antes); // a escolha ficou guardada
  await page.getByRole('button', { name: 'Tema escuro' }).press('Space');
  expect(await fundo(page)).toBe(antes);
});

test('T2.5: contraste AA nos dois temas (axe, depois de trocar pelo botão)', async ({ page }) => {
  await page.goto('/');
  expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);
  await page.getByRole('button', { name: 'Tema escuro' }).click();
  expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);
});

test('T2.5: sem armazenamento, o botão ainda troca o tema', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } });
  });
  await page.goto('/');
  const antes = await fundo(page);
  await page.getByRole('button', { name: 'Tema escuro' }).click();
  expect(await fundo(page)).not.toBe(antes);
});
