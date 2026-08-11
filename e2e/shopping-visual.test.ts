/**
 * Wizualna weryfikacja strony listy zakupów.
 * Uruchom: npx playwright test e2e/shopping-visual.test.ts --project=chromium
 */
import { test } from '@playwright/test';
import * as path from 'path';

const SC = path.resolve('e2e/screenshots');
const PLANS_KEY = 'mokoszo:plans:v2';

async function setPlan(page, days: { date: string; recipeIds: string[] }[]) {
  const planId = 'visual-test-plan';
  const storage = {
    version: 2,
    plans: [
      {
        id: planId,
        days: days.map((d) => ({
          date: d.date,
          slots: d.recipeIds.map((id, i) => ({
            id: `s-${d.date}-${i}`,
            name: i === 0 ? 'śniadanie' : i === 1 ? 'obiad' : 'kolacja',
            recipeId: id,
            isCustom: false,
          })),
        })),
        createdAt: '2026-08-11T12:00:00.000Z',
      },
    ],
    activeForShopping: planId,
  };
  await page.evaluate(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: PLANS_KEY, data: storage }
  );
}

test('lista: stan pusty', async ({ page }) => {
  await page.goto('/mokoszo/lista-zakupow/');
  await page.evaluate((key) => localStorage.removeItem(key), PLANS_KEY);
  await page.reload();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SC}/10-shopping-empty.png`, fullPage: true });
});

test('lista: 1 przepis (spaghetti)', async ({ page }) => {
  await page.goto('/mokoszo/lista-zakupow/');
  await setPlan(page, [
    { date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] },
  ]);
  await page.reload();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SC}/11-shopping-spaghetti.png`, fullPage: true });
});

test('lista: 3 dni z różnymi przepisami', async ({ page }) => {
  await page.goto('/mokoszo/lista-zakupow/');
  await setPlan(page, [
    { date: '2026-08-11', recipeIds: ['spaghetti-bolognese', 'owsianka-z-bananem'] },
    { date: '2026-08-12', recipeIds: ['zupa-pomidorowa'] },
    { date: '2026-08-13', recipeIds: ['salatka-grecka', 'nalesniki'] },
  ]);
  await page.reload();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SC}/12-shopping-3days.png`, fullPage: true });
});

test('lista: zaznaczanie checkboxów', async ({ page }) => {
  await page.goto('/mokoszo/lista-zakupow/');
  await setPlan(page, [
    { date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] },
  ]);
  await page.reload();
  await page.waitForTimeout(2000);

  // Zaznacz pierwsze 3 checkboxy
  const checkboxes = page.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  for (let i = 0; i < Math.min(3, count); i++) {
    await checkboxes.nth(i).click();
    await page.waitForTimeout(100);
  }
  await page.screenshot({ path: `${SC}/13-shopping-checked.png`, fullPage: true });
});

test('lista: zwijanie kategorii', async ({ page }) => {
  await page.goto('/mokoszo/lista-zakupow/');
  await setPlan(page, [
    { date: '2026-08-11', recipeIds: ['spaghetti-bolognese', 'owsianka-z-bananem'] },
  ]);
  await page.reload();
  await page.waitForTimeout(2000);

  // Zwij pierwszą kategorię
  await page.locator('section button').first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/14-shopping-collapsed.png`, fullPage: true });
});

test('lista: mobile view (Pixel 5)', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto('/mokoszo/lista-zakupow/');
  await setPlan(page, [
    { date: '2026-08-11', recipeIds: ['spaghetti-bolognese', 'owsianka-z-bananem'] },
    { date: '2026-08-12', recipeIds: ['zupa-pomidorowa'] },
  ]);
  await page.reload();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SC}/15-shopping-mobile.png`, fullPage: true });
});
