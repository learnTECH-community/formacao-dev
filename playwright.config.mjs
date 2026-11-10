import { defineConfig, devices } from '@playwright/test';

// Specs do fluxo principal, que rodam também no WebKit e no celular (T7.9).
const FLUXO_PRINCIPAL = ['fluxo.spec.mjs', 'rotas.spec.mjs', 'estados.spec.mjs'];

const porta = Number(process.env.PORTA_PAINEL) || 4317;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // T7.11: no CI, a lista no log e o relatório HTML (artefato "playwright-report").
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: `http://127.0.0.1:${porta}`,
    reducedMotion: 'reduce',
    // Trace e print só dos testes que falharam (artefato "painel-test-results").
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'claro', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    { name: 'escuro', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
    // T7.9: o fluxo principal também no WebKit (motor do Safari) e num celular emulado.
    { name: 'webkit', testMatch: FLUXO_PRINCIPAL, use: { ...devices['Desktop Safari'] } },
    { name: 'celular', testMatch: FLUXO_PRINCIPAL, use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${porta} --strictPort`,
    url: `http://127.0.0.1:${porta}/`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
