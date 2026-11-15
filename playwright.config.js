// Testes no navegador (Playwright): acessibilidade com axe-core e critérios de aceite.
// Primeira vez: `npx playwright install chromium` (ou defina CHROME_PATH=/usr/bin/chromium).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/a11y',
  timeout: 60_000,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    ...(process.env.CHROME_PATH ? { launchOptions: { executablePath: process.env.CHROME_PATH } } : {}),
  },
  webServer: {
    command: 'npm run build && npx vite preview --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
