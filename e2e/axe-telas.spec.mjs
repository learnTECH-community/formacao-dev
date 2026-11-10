// T7.2: axe (WCAG 2.1 A e AA) em todas as telas do painel. O playwright.config roda
// cada teste nos projetos claro e escuro; a falha lista a regra e quantos elementos falharam.
import { test, expect } from '@playwright/test';
import { abrir, violacoesDoAxe } from './apoio.mjs';

const telas = [
  {
    nome: 'página inicial',
    abrir: (page) => abrir(page),
  },
  {
    nome: 'página inicial com filtro',
    abrir: (page) => abrir(page, '/?trilha=T2&situacao=a-fazer'),
  },
  {
    nome: 'detalhe da trilha',
    abrir: async (page) => {
      await page.goto('/trilha/T3');
      await expect(page.getByRole('heading', { level: 2, name: /^T3 / })).toBeVisible();
    },
  },
  {
    nome: 'trilha não encontrada',
    abrir: async (page) => {
      await page.goto('/trilha/T99');
      await expect(page.getByRole('heading', { level: 2, name: 'Trilha não encontrada' })).toBeVisible();
    },
  },
  {
    nome: 'página não encontrada',
    abrir: async (page) => {
      await page.goto('/nao-existe');
      await expect(page.getByRole('heading', { level: 2, name: 'Página não encontrada' })).toBeVisible();
    },
  },
  {
    nome: 'erro ao carregar o catálogo',
    abrir: async (page) => {
      await page.route('**/CATALOGO.md', (rota) => rota.abort('internetdisconnected'));
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
    },
  },
  {
    nome: 'catálogo vazio',
    abrir: async (page) => {
      await page.route('**/CATALOGO.md', (rota) =>
        rota.fulfill({ status: 200, contentType: 'text/markdown', body: '## T0 · Fundamentos\n' }),
      );
      await page.goto('/');
      await expect(page.getByRole('status')).toContainText('O catálogo ainda não tem itens.');
    },
  },
];

for (const tela of telas) {
  test(`T7.2: axe sem violação: ${tela.nome}`, async ({ page }) => {
    await tela.abrir(page);
    expect(await violacoesDoAxe(page)).toEqual([]);
  });
}

test('T7.2: a falha do axe diz a regra e quantos elementos falharam', async ({ page }) => {
  await abrir(page);
  // Quebra o contraste de propósito, para ver o formato da mensagem.
  await page.addStyleTag({ content: '.marca { color: #eeeeee !important; background: #ffffff !important; }' });
  expect(await violacoesDoAxe(page)).toEqual(['color-contrast: 1 elemento']);
});
