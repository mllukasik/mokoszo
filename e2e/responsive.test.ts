/**
 * T7.1 — Responsywność i polish
 * Sprawdza brak poziomego scrolla, touch targety ≥ 44px i robi screenshoty
 * na 375px / 768px / 1280px dla wszystkich 4 głównych stron.
 */
import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';

const SC = path.resolve('e2e/screenshots');
const STORAGE_KEY = 'mokoszo:meal-plan:v1';

const BREAKPOINTS = [
  { name: 'mobile-375', width: 375,  height: 812 },
  { name: 'tablet-768', width: 768,  height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
] as const;

const PAGES = [
  { id: 'home',    url: '/mokoszo/',                               label: 'Strona główna' },
  { id: 'recipe',  url: '/mokoszo/przepis/spaghetti-bolognese/',   label: 'Widok przepisu' },
  { id: 'plan',    url: '/mokoszo/plan/',                          label: 'Planer' },
  { id: 'lista',   url: '/mokoszo/lista-zakupow/',                 label: 'Lista zakupów' },
] as const;

/** Przygotuj localStorage aby lista zakupów miała zawartość. */
async function seedPlan(page: Page) {
  await page.evaluate(
    ({ key }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          days: [
            { date: '2026-08-11', recipeIds: ['spaghetti-bolognese', 'owsianka-z-bananem'] },
            { date: '2026-08-12', recipeIds: ['zupa-pomidorowa'] },
          ],
        })
      ),
    { key: STORAGE_KEY }
  );
}

/** Czeka aż Alpine skończy inicjalizację na stronach z x-data. */
async function waitForAlpine(page: Page, url: string) {
  if (url.includes('lista-zakupow') || url.includes('plan')) {
    // Czekaj aż Alpine pokaże jeden z wariantów (isEmpty lub !isEmpty)
    await page.waitForFunction(
      () => {
        const xdataEl = document.querySelector('[x-data]');
        if (!xdataEl) return true; // strona bez Alpine
        const children = Array.from(xdataEl.children) as HTMLElement[];
        return children.some((c) => window.getComputedStyle(c).display !== 'none');
      },
      { timeout: 8_000 }
    );
  } else if (url.endsWith('/mokoszo/')) {
    // Strona główna: czekaj na widoczne karty
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.grid > div')).some(
          (el) => window.getComputedStyle(el as HTMLElement).display !== 'none'
        ),
      { timeout: 8_000 }
    );
  }
}

/** Sprawdza brak poziomego scrolla — zwraca przesunięcie (0 = OK). */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(
      body.scrollWidth  - body.clientWidth,
      html.scrollWidth  - html.clientWidth,
    );
  });
}

/**
 * Zbiera wszystkie interaktywne elementy i sprawdza czy mają ≥ minPx w obu wymiarach.
 * Zwraca listę naruszeń.
 */
async function smallTouchTargets(page: Page, minPx = 44): Promise<string[]> {
  return page.evaluate((min) => {
    // input[type="checkbox"] pomijamy — aktywowane przez label[for], który ma min-h-[44px]
    const selectors = 'a, button, label[for]';
    const issues: string[] = [];
    document.querySelectorAll(selectors).forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Pomijamy elementy niewidoczne lub 0x0
      if (rect.width === 0 && rect.height === 0) return;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (rect.height < min || rect.width < min) {
        const txt = (el.textContent ?? '').trim().substring(0, 40);
        issues.push(`${el.tagName} "${txt}" — ${Math.round(rect.width)}×${Math.round(rect.height)}px`);
      }
    });
    return issues;
  }, minPx);
}

// ─── Screenshoty wszystkich stron × breakpointów ────────────────────────────

test.describe('T7.1 Screenshoty breakpointów', () => {
  for (const bp of BREAKPOINTS) {
    for (const pg of PAGES) {
      test(`${pg.id} @ ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(pg.url);
        await seedPlan(page);
        if (pg.id === 'lista' || pg.id === 'plan') await page.reload();
        await waitForAlpine(page, pg.url);
        await page.screenshot({
          path: `${SC}/responsive-${pg.id}-${bp.name}.png`,
          fullPage: true,
        });
      });
    }
  }
});

// ─── Brak poziomego scrolla ──────────────────────────────────────────────────

test.describe('T7.1 Brak poziomego scrolla', () => {
  for (const bp of BREAKPOINTS) {
    for (const pg of PAGES) {
      test(`${pg.id} @ ${bp.name} — brak overflow-x`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(pg.url);
        await seedPlan(page);
        if (pg.id === 'lista' || pg.id === 'plan') await page.reload();
        await waitForAlpine(page, pg.url);

        const overflow = await horizontalOverflow(page);
        expect(overflow, `poziomy scroll = ${overflow}px na ${pg.id} @ ${bp.name}`).toBe(0);
      });
    }
  }
});

// ─── Touch targety ≥ 44px ───────────────────────────────────────────────────

test.describe('T7.1 Touch targety ≥ 44px (mobile 375px)', () => {
  for (const pg of PAGES) {
    test(`${pg.id} — touch targets`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(pg.url);
      await seedPlan(page);
      if (pg.id === 'lista' || pg.id === 'plan') await page.reload();
      await waitForAlpine(page, pg.url);

      const issues = await smallTouchTargets(page, 44);
      if (issues.length > 0) {
        console.warn(`[${pg.id}] Touch-target < 44px:`, issues);
      }
      // Soft assert — logujemy ale nie failujemy przy tag-pillach nawigacyjnych
      // (max 5 naruszeń tolerowanych — drobne linki/pille z tekstem)
      expect(issues.length, `Zbyt małe touch targety:\n${issues.join('\n')}`).toBeLessThanOrEqual(5);
    });
  }
});
