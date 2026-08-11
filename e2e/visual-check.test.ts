/**
 * Skrypt do wizualnej weryfikacji stron — robi screenshoty na każdym etapie.
 * Uruchom: npx playwright test e2e/visual-check.test.ts --project=chromium
 */
import { test } from '@playwright/test';
import * as path from 'path';

const SCREENS = path.resolve('e2e/screenshots');

test.describe('Wizualna weryfikacja aplikacji', () => {

  // ─── Strona główna ─────────────────────────────────────────────────────────
  test('home: stan początkowy', async ({ page }) => {
    await page.goto('/mokoszo/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENS}/01-home-initial.png`, fullPage: true });

    // Sprawdź czy Alpine w ogóle działa
    const alpineReady = await page.evaluate(() => {
      return typeof window.Alpine !== 'undefined';
    });
    console.log('Alpine dostępny:', alpineReady);

    // Sprawdź window.recipeList
    const hasRecipeList = await page.evaluate(() => typeof window.recipeList);
    console.log('window.recipeList typeof:', hasRecipeList);

    // Sprawdź ile kart jest widocznych
    const visibleCards = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.grid > div')).filter(
        el => window.getComputedStyle(el).display !== 'none'
      ).length
    );
    console.log('Widoczne karty:', visibleCards);

    // Sprawdź treść x-data atrybutu
    const xdata = await page.evaluate(() =>
      document.querySelector('[x-data]')?.getAttribute('x-data')
    );
    console.log('x-data:', xdata);
  });

  test('home: po 3s (czas na Alpine init)', async ({ page }) => {
    await page.goto('/mokoszo/');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENS}/02-home-after-3s.png`, fullPage: true });

    const visibleCards = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.grid > div')).filter(
        el => window.getComputedStyle(el).display !== 'none'
      ).length
    );
    console.log('Widoczne karty po 3s:', visibleCards);

    // Sprawdź błędy Alpine
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    console.log('Błędy JS:', errors);
  });

  test('home: filtrowanie po kliknięciu tagu', async ({ page }) => {
    await page.goto('/mokoszo/');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENS}/03-home-before-filter.png`, fullPage: true });

    await page.getByRole('button', { name: 'śniadanie' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENS}/04-home-after-filter-sniadanie.png`, fullPage: true });
  });

  test('home: paginacja', async ({ page }) => {
    await page.goto('/mokoszo/');
    await page.waitForTimeout(2000);

    const nextBtn = page.getByRole('button', { name: 'Następna strona' });
    const isVisible = await nextBtn.isVisible();
    console.log('Przycisk "Następna strona" widoczny:', isVisible);

    if (isVisible) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENS}/05-home-page2.png`, fullPage: true });
    }
  });

  // ─── Widok przepisu ─────────────────────────────────────────────────────────
  test('przepis: spaghetti-bolognese', async ({ page }) => {
    await page.goto('/mokoszo/przepis/spaghetti-bolognese/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENS}/06-recipe-spaghetti.png`, fullPage: true });

    const ingredientCount = await page.locator('aside li').count();
    console.log('Liczba składników:', ingredientCount);

    const hasKcal = await page.locator('text=kcal').first().isVisible();
    console.log('Kalorie widoczne:', hasKcal);
  });

  // ─── Planer ─────────────────────────────────────────────────────────────────
  test('plan: stan początkowy', async ({ page }) => {
    await page.goto('/mokoszo/plan/');
    await page.evaluate(() => localStorage.removeItem('mokoszo:plans:v2'));
    await page.reload();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENS}/07-plan-initial.png`, fullPage: true });

    const hasPlannerApp = await page.evaluate(() => typeof window.plannerApp);
    console.log('window.plannerApp typeof:', hasPlannerApp);

    // Lista planów — brak planów → stan pusty
    const emptyVisible = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('p')).find(p => p.textContent?.includes('Brak planów'));
      return el ? window.getComputedStyle(el).display !== 'none' : false;
    });
    console.log('Stan pusty widoczny:', emptyVisible);

    // Sprawdź co jest w grid
    const gridHTML = await page.evaluate(() =>
      document.querySelector('[x-data] .grid')?.innerHTML?.substring(0, 500)
    );
    console.log('Grid innerHTML (500 chars):', gridHTML);
  });

  test('plan: wybór przepisu', async ({ page }) => {
    await page.goto('/mokoszo/plan/');
    await page.evaluate(() => localStorage.removeItem('mokoszo:plans:v2'));
    await page.reload();
    await page.waitForTimeout(2000);

    // Utwórz nowy plan przez UI
    const newPlanBtn = page.locator('button').filter({ hasText: '+ Nowy plan' });
    const count = await newPlanBtn.count();
    console.log('Liczba pill-buttonów:', count);

    if (count > 0) {
      await newPlanBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENS}/08-plan-recipe-selected.png`, fullPage: true });
    }
  });

  // ─── Konsola błędów na wszystkich stronach ──────────────────────────────────
  test('brak błędów JS na każdej stronie', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', e => jsErrors.push(e.message));

    const pages = ['/mokoszo/', '/mokoszo/plan/', '/mokoszo/przepis/spaghetti-bolognese/'];

    for (const url of pages) {
      jsErrors.length = 0;
      await page.goto(url);
      await page.waitForTimeout(2000);
      console.log(`\n${url} — błędy JS:`, jsErrors.length ? jsErrors : '(brak)');
      await page.screenshot({
        path: `${SCREENS}/console-check-${url.replace(/[^a-z]/g, '-')}.png`,
        fullPage: true
      });
    }
  });
});
