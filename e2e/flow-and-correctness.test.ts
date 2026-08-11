/**
 * Testy 1 i 2:
 *   1. Full E2E flow: przeglądanie → plan → lista zakupów
 *   2. Poprawność danych: ilości składników i makra przy skalowaniu planu
 */
import { test, expect, type Page } from '@playwright/test';

const STORAGE_KEY = 'mokoszo:meal-plan:v1';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function setPlan(page: Page, days: { date: string; recipeIds: string[] }[]) {
  await page.evaluate(
    ({ key, plan }) => localStorage.setItem(key, JSON.stringify(plan)),
    { key: STORAGE_KEY, plan: { version: 1, days } }
  );
}

async function clearAll(page: Page) {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
}

/** Czeka aż Alpine pokaże zawartość listy zakupów (nie stan pusty). */
async function waitForShoppingContent(page: Page) {
  await page.waitForFunction(
    () => {
      const full = document.querySelector('[x-show="!isEmpty"]') as HTMLElement | null;
      return full ? window.getComputedStyle(full).display !== 'none' : false;
    },
    { timeout: 8_000 }
  );
}

/** Czeka aż Alpine pokaże karty na stronie głównej. */
async function waitForCards(page: Page) {
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('.grid > div')).some(
        (el) => window.getComputedStyle(el as HTMLElement).display !== 'none'
      ),
    { timeout: 8_000 }
  );
}

/** Czeka aż Alpine wyrenderuje karty dni w planerze. */
async function waitForDays(page: Page, n = 3) {
  await page.waitForFunction(
    (expected: number) =>
      document.querySelectorAll('[x-data] .grid > div.flex').length === expected,
    n,
    { timeout: 8_000 }
  );
}

/** Zwraca liczbę zmiennoprzecinkową z tekstu elementu (np. "732.5" z "732.5 kcal"). */
async function readMacroValue(page: Page, label: string): Promise<number> {
  // Makra są w divach p.text-2xl obok etykiety
  const card = page.locator('.rounded-xl').filter({ hasText: label }).first();
  const text = await card.locator('p.text-2xl').textContent();
  return parseFloat((text ?? '0').replace(/[^\d.]/g, ''));
}

// ─── TEST 1: Full E2E flow ───────────────────────────────────────────────────

test.describe('Test 1 — Pełny flow usera', () => {
  test('przeglądanie → szczegóły przepisu → plan → lista zakupów', async ({ page }) => {
    // ── Krok 1: strona główna ─────────────────────────────────────────────
    await page.goto('/mokoszo/');
    await clearAll(page);
    await waitForCards(page);

    // Widoczne karty istnieją
    const cards = page.locator('.grid > div').filter({ visible: true });
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // ── Krok 2: wejście w szczegóły pierwszego przepisu ───────────────────
    const firstCard = cards.first().locator('a');
    const recipeTitle = await firstCard.getByRole('heading').textContent();
    await firstCard.click();

    await expect(page).toHaveURL(/\/mokoszo\/przepis\/.+\//);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(recipeTitle!.trim());

    // Przepis ma składniki i makra
    expect(await page.locator('aside li').count()).toBeGreaterThan(0);
    await expect(page.locator('text=kcal').first()).toBeVisible();

    // ── Krok 3: przejście do planera przez nawigację ───────────────────────
    await page.getByRole('link', { name: 'Plan' }).click();
    await expect(page).toHaveURL('/mokoszo/plan/');
    await waitForDays(page, 3);

    // Planer pokazuje 3 dni
    const dayCounts = await page.locator('[x-data] .grid > div.flex').count();
    expect(dayCounts).toBe(3);

    // ── Krok 4: wybór przepisu na dzień 1 ────────────────────────────────
    const firstDay = page.locator('[x-data] .grid > div.flex').first();
    const firstRecipeBtn = firstDay.getByRole('button').first();
    const chosenRecipe = (await firstRecipeBtn.textContent())!.trim();

    await firstRecipeBtn.click();
    await page.waitForTimeout(300);

    // Wybrany przepis widoczny w liście dnia
    await expect(firstDay.locator('text=✓')).toBeVisible();
    await expect(firstDay).toContainText(chosenRecipe);

    // ── Krok 5: przejście do listy zakupów przez CTA ──────────────────────
    const cta = page.locator('main a[href*="lista-zakupow"]');
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page).toHaveURL('/mokoszo/lista-zakupow/');
    await waitForShoppingContent(page);

    // ── Krok 6: lista zakupów jest uzupełniona ────────────────────────────
    // Co najmniej 1 kategoria
    const catButtons = page.locator('section button').filter({ hasText: /\S+/ });
    expect(await catButtons.count()).toBeGreaterThan(0);

    // Co najmniej 1 składnik
    const items = page.locator('ul li');
    expect(await items.count()).toBeGreaterThan(0);

    // Makra > 0
    const kcalCard = page.locator('.rounded-xl').filter({ hasText: 'kcal' }).first();
    const kcalText = await kcalCard.locator('p.text-2xl').textContent();
    expect(parseFloat(kcalText ?? '0')).toBeGreaterThan(0);

    // ── Krok 7: powrót do planu przez "Wróć do planu" ────────────────────
    await page.getByRole('link', { name: /wróć do planu/i }).click();
    await expect(page).toHaveURL('/mokoszo/plan/');
    await waitForDays(page, 3);

    // Plan wciąż pamięta wybrany przepis (persist)
    const restoredDay = page.locator('[x-data] .grid > div.flex').first();
    await expect(restoredDay.locator('text=✓')).toBeVisible();
    await expect(restoredDay).toContainText(chosenRecipe);
  });
});

// ─── TEST 2: Poprawność danych ───────────────────────────────────────────────

test.describe('Test 2 — Poprawność ilości składników', () => {
  /**
   * Spaghetti Bolognese — znane ilości:
   *   makaron-spaghetti  200 g
   *   mieso-mielone-wolowe  300 g
   *   cebula  1 szt
   *   czosnek  2 szt
   *   pomidory-z-puszki  400 g
   *   oliwa-z-oliwek  30 ml
   *   sol  1 szczypta
   *   pieprz  1 szczypta
   */
  test('1 dzień spaghetti → dokładne ilości składników', async ({ page }) => {
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlan(page, [
      { date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] },
    ]);
    await page.reload();
    await waitForShoppingContent(page);

    const assertItem = async (name: string, qty: string) => {
      const row = page.locator('ul li').filter({ hasText: name });
      await expect(row, `${name}: oczekiwano ${qty}`).toContainText(qty);
    };

    await assertItem('Makaron spaghetti',          '200 g');
    await assertItem('Mięso mielone wołowe',        '300 g');
    await assertItem('Cebula',                      '1 szt');
    await assertItem('Czosnek (ząbek)',             '2 szt');
    await assertItem('Pomidory z puszki (krojone)', '400 g');
    await assertItem('Oliwa z oliwek',              '30 ml');
  });

  test('2 dni spaghetti → ilości podwojone', async ({ page }) => {
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlan(page, [
      { date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] },
      { date: '2026-08-12', recipeIds: ['spaghetti-bolognese'] },
    ]);
    await page.reload();
    await waitForShoppingContent(page);

    const assertItem = async (name: string, qty: string) => {
      const row = page.locator('ul li').filter({ hasText: name });
      await expect(row, `${name}: oczekiwano ${qty}`).toContainText(qty);
    };

    await assertItem('Makaron spaghetti',           '400 g');
    await assertItem('Mięso mielone wołowe',         '600 g');
    await assertItem('Cebula',                       '2 szt');
    await assertItem('Czosnek (ząbek)',              '4 szt');
    await assertItem('Pomidory z puszki (krojone)',  '800 g');
    await assertItem('Oliwa z oliwek',               '60 ml');
  });

  test('2 dni spaghetti → makra ≈ 2× makra 1 dnia', async ({ page }) => {
    // Zmierz 1 dzień
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlan(page, [{ date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] }]);
    await page.reload();
    await waitForShoppingContent(page);

    const cal1  = await readMacroValue(page, 'kcal');
    const prot1 = await readMacroValue(page, 'białko');
    const fat1  = await readMacroValue(page, 'tłuszcze');
    const carb1 = await readMacroValue(page, 'węglowodany');

    expect(cal1).toBeGreaterThan(0);

    // Zmierz 2 dni
    await setPlan(page, [
      { date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] },
      { date: '2026-08-12', recipeIds: ['spaghetti-bolognese'] },
    ]);
    await page.reload();
    await waitForShoppingContent(page);

    const cal2  = await readMacroValue(page, 'kcal');
    const prot2 = await readMacroValue(page, 'białko');
    const fat2  = await readMacroValue(page, 'tłuszcze');
    const carb2 = await readMacroValue(page, 'węglowodany');

    // Tolerancja 0.2 kcal/g (zaokrąglenia)
    expect(cal2).toBeCloseTo(cal1 * 2, 0);
    expect(prot2).toBeCloseTo(prot1 * 2, 0);
    expect(fat2).toBeCloseTo(fat1 * 2, 0);
    expect(carb2).toBeCloseTo(carb1 * 2, 0);
  });

  test('spaghetti + owsianka (ten sam dzień) → składniki z obu bez duplikatów', async ({ page }) => {
    /**
     * Spaghetti i owsianka nie dzielą żadnego składnika.
     * Suma powinna zawierać wszystkie składniki obu przepisów bez powtórzeń.
     * spaghetti: 8 składników, owsianka: 5 składników → razem 13 unikalnych wpisów.
     */
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlan(page, [
      { date: '2026-08-11', recipeIds: ['spaghetti-bolognese', 'owsianka-z-bananem'] },
    ]);
    await page.reload();
    await waitForShoppingContent(page);

    // Zweryfikuj składniki z obu przepisów
    const assertItem = async (name: string, qty: string) => {
      const row = page.locator('ul li').filter({ hasText: name });
      await expect(row, `${name}: oczekiwano ${qty}`).toContainText(qty);
    };

    // Ze spaghetti
    await assertItem('Makaron spaghetti',  '200 g');
    await assertItem('Mięso mielone wołowe', '300 g');
    // Z owsianki
    await assertItem('Płatki owsiane', '80 g');
    await assertItem('Mleko',          '200 ml');
    await assertItem('Banan',          '1 szt');

    // Brak duplikatów — każda nazwa na liście pojawia się dokładnie raz
    const allNames = await page
      .locator('ul li label span:first-child')
      .allTextContents();
    const trimmed = allNames.map((n) => n.trim()).filter(Boolean);
    const unique = new Set(trimmed);
    expect(unique.size).toBe(trimmed.length);
  });

  test('ten sam składnik w 2 przepisach różnych dni → jedna zsumowana pozycja', async ({ page }) => {
    /**
     * zupa-pomidorowa i zupa-jarzynowa obie używają cebuli (po 1 szt każda).
     * Plan: dzień 1 zupa-pomidorowa, dzień 2 zupa-jarzynowa.
     * Oczekiwana lista: "Cebula 2 szt" (nie dwa wpisy "Cebula 1 szt").
     */
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlan(page, [
      { date: '2026-08-11', recipeIds: ['zupa-pomidorowa'] },
      { date: '2026-08-12', recipeIds: ['zupa-jarzynowa'] },
    ]);
    await page.reload();
    await waitForShoppingContent(page);

    // "Cebula" pojawia się na liście dokładnie raz
    const cebula = page.locator('ul li').filter({ hasText: 'Cebula' });
    await expect(cebula).toHaveCount(1);

    // I ma zsumowaną ilość (obie zupy mają po 1 szt cebuli → 2 szt)
    await expect(cebula).toContainText('2 szt');
  });

  test('kolejność kategorii zgodna z CATEGORY_ORDER', async ({ page }) => {
    /**
     * CATEGORY_ORDER: warzywa, owoce, mięso, nabiał, zboża, konserwy, oleje, przyprawy
     * Plan z spaghetti + owsianka pokrywa: warzywa, mięso, nabiał, zboża, konserwy, oleje, przyprawy.
     * Weryfikujemy że kategorie pojawiają się w tej kolejności (bez owoców, bo nie ma).
     */
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlan(page, [
      { date: '2026-08-11', recipeIds: ['spaghetti-bolognese', 'owsianka-z-bananem'] },
    ]);
    await page.reload();
    await waitForShoppingContent(page);

    const catHeaders = await page
      .locator('section > div > button span:first-child')
      .allTextContents();

    const ORDER = ['Warzywa', 'Owoce', 'Mięso', 'Nabiał', 'Zboża', 'Konserwy', 'Oleje', 'Przyprawy'];

    // Filtruj ORDER do kategorii które faktycznie się pojawiają na liście
    const expected = ORDER.filter((label) =>
      catHeaders.some((h) => h.includes(label))
    );
    const actual = catHeaders
      .map((h) => ORDER.find((label) => h.includes(label)))
      .filter(Boolean) as string[];

    expect(actual).toEqual(expected);
  });
});
