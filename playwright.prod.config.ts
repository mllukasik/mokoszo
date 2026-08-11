/**
 * Konfiguracja Playwright dla testów produkcyjnych.
 * Uruchom: npx playwright test --config playwright.prod.config.ts
 *
 * Nie startuje lokalnego serwera — odpytuje bezpośrednio live URL.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Wyklucz testy wizualne (screenshoty) i shopping-visual — tylko testy logiczne
  testIgnore: ['**/visual-check.test.ts', '**/shopping-visual.test.ts', '**/responsive.test.ts'],
  fullyParallel: false, // produkcja — nie przeciążamy serwera
  retries: 1,           // 1 retry bo sieć może się zawiesić
  reporter: 'list',
  use: {
    baseURL: 'https://portfolio.mllukasik.pl',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Timeout na wolniejszą sieć
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium-prod',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Brak webServer — testujemy live
});
