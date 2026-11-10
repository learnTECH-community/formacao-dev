import { defineConfig, devices } from '@playwright/test';

const porta = Number(process.env.PORTA_PAINEL) || 4317;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'line',
  use: {
    baseURL: `http://127.0.0.1:${porta}`,
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'claro', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    { name: 'escuro', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${porta} --strictPort`,
    url: `http://127.0.0.1:${porta}/`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
