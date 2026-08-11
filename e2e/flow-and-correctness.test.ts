/**
 * Testy 1 i 2:
 *   1. Full E2E flow: przeglądanie → tworzenie planu → lista zakupów
 *   2. Poprawność danych: ilości składników i makra przy skalowaniu planu
 */
import { test, expect, type Page } from '@playwright/test';

const PLANS_KEY = 'mokoszo:plans:v2';

// ─── Storage helpers ─────────────────────────────────────────────────────────

/** Tworzy v2-plan z listą dni i recipeIds, ustawia activeForShopping. */
async function setPlanV2(page: Page, days: { date: string; recipeIds: string[] }[]) {
  const planId = 'test-plan-1';
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

async function clearAll(page: Page) {
  await page.evaluate((key) => localStorage.removeItem(key), PLANS_KEY);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

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

/** Czeka aż Alpine wyrenderuje karty na stronie głównej. */
async function waitForCards(page: Page) {
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('.grid > div')).some(
        (el) => window.getComputedStyle(el as HTMLElement).display !== 'none'
      ),
    { timeout: 8_000 }
  );
}

/** Czeka aż widok listy planów jest aktywny (przycisk "+ Nowy plan" widoczny). */
async function waitForPlanList(page: Page) {
  await page.waitForFunction(
    () => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '+ Nowy plan'
      );
      return btn ? window.getComputedStyle(btn).display !== 'none' : false;
    },
    { timeout: 10_000 }
  );
}

/** Czeka aż edytor planu renderuje min. n dni. */
async function waitForEditView(page: Page, minDays = 1) {
  await page.waitForFunction(
    (n: number) => {
      const back = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '← Plany'
      );
      if (!back || window.getComputedStyle(back).display === 'none') return false;
      return document.querySelectorAll('.space-y-4 > div.rounded-xl').length >= n;
    },
    minDays,
    { timeout: 10_000 }
  );
}

/** Zwraca liczbę zmiennoprzecinkową z tekstu elementu (np. "732.5" z "732.5 kcal"). */
async function readMacroValue(page: Page, label: string): Promise<number> {
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

    const cards = page.locator('.grid > div').filter({ visible: true });
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // ── Krok 2: szczegóły pierwszego przepisu ─────────────────────────────
    const firstCard = cards.first().locator('a');
    const recipeTitle = await firstCard.getByRole('heading').textContent();
    await firstCard.click();

    await expect(page).toHaveURL(/\/mokoszo\/przepis\/.+\//);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(recipeTitle!.trim());
    expect(await page.locator('aside li').count()).toBeGreaterThan(0);
    await expect(page.locator('text=kcal').first()).toBeVisible();

    // ── Krok 3: przejście do planera ──────────────────────────────────────
    await page.getByRole('link', { name: 'Plan' }).click();
    await expect(page).toHaveURL('/mokoszo/plan/');
    await waitForPlanList(page);

    // ── Krok 4: utwórz nowy plan (3 dni) ─────────────────────────────────
    await page.getByRole('button', { name: '+ Nowy plan' }).click();
    await page.waitForSelector('#plan-start', { state: 'visible' });
    await page.fill('#plan-start', '2026-08-12');
    await page.fill('#plan-end', '2026-08-14');
    await page.getByRole('button', { name: 'Utwórz plan' }).click();
    await waitForEditView(page, 3);

    // ── Krok 5: wybierz przepis dla śniadania w dniu 1 ───────────────────
    const firstDay = page.locator('.space-y-4 > div.rounded-xl').first();
    await firstDay.getByText('+ wybierz przepis').first().click();
    const pickerBtns = firstDay.locator('.flex.flex-wrap.gap-1\\.5').first().getByRole('button');
    const chosenRecipe = (await pickerBtns.first().textContent())!.trim();
    await pickerBtns.first().click();
    await page.waitForTimeout(300);

    // Wybrany przepis widoczny w slocie
    await expect(firstDay).toContainText(chosenRecipe);

    // ── Krok 6: przejście do listy zakupów ────────────────────────────────
    await page.getByRole('button', { name: '🛒 Lista zakupów' }).click();
    await expect(page).toHaveURL('/mokoszo/lista-zakupow/');
    await waitForShoppingContent(page);

    // Lista ma składniki i makra > 0
    expect(await page.locator('ul li').count()).toBeGreaterThan(0);
    const kcalText = await page
      .locator('.rounded-xl').filter({ hasText: 'kcal' }).first()
      .locator('p.text-2xl').textContent();
    expect(parseFloat(kcalText ?? '0')).toBeGreaterThan(0);

    // ── Krok 7: powrót do planów ──────────────────────────────────────────
    await page.getByRole('link', { name: /wróć do planów/i }).click();
    await expect(page).toHaveURL('/mokoszo/plan/');
    await waitForPlanList(page);

    // Plan widoczny na liście z datą
    await expect(page.locator('.grid > div').filter({ hasText: 'sie' }).first()).toBeVisible();
  });
});

// ─── TEST 2: Poprawność danych ───────────────────────────────────────────────

test.describe('Test 2 — Poprawność ilości składników', () => {
  /**
   * Spaghetti Bolognese — znane ilości:
   *   makaron-spaghetti           200 g
   *   mieso-mielone-wolowe        300 g
   *   cebula                        1 szt
   *   czosnek                       2 szt
   *   pomidory-z-puszki           400 g
   *   oliwa-z-oliwek               30 ml
   *   sol                           1 szczypta
   *   pieprz                        1 szczypta
   */
  test('1 dzień spaghetti → dokładne ilości składników', async ({ page }) => {
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlanV2(page, [{ date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] }]);
    await page.reload();
    await waitForShoppingContent(page);

    const assertItem = async (name: string, qty: string) => {
      const row = page.locator('ul li').filter({ hasText: name });
      await expect(row, `${name}: oczekiwano ${qty}`).toContainText(qty);
    };

    await assertItem('Makaron spaghetti',           '200 g');
    await assertItem('Mięso mielone wołowe',         '300 g');
    await assertItem('Cebula',                       '1 szt');
    await assertItem('Czosnek (ząbek)',              '2 szt');
    await assertItem('Pomidory z puszki (krojone)',  '400 g');
    await assertItem('Oliwa z oliwek',               '30 ml');
  });

  test('2 dni spaghetti (2 sloty w tym samym planie) → ilości podwojone', async ({ page }) => {
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlanV2(page, [
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
    await setPlanV2(page, [{ date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] }]);
    await page.reload();
    await waitForShoppingContent(page);

    const cal1  = await readMacroValue(page, 'kcal');
    const prot1 = await readMacroValue(page, 'białko');
    const fat1  = await readMacroValue(page, 'tłuszcze');
    const carb1 = await readMacroValue(page, 'węglowodany');
    expect(cal1).toBeGreaterThan(0);

    // Zmierz 2 dni
    await setPlanV2(page, [
      { date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] },
      { date: '2026-08-12', recipeIds: ['spaghetti-bolognese'] },
    ]);
    await page.reload();
    await waitForShoppingContent(page);

    const cal2  = await readMacroValue(page, 'kcal');
    const prot2 = await readMacroValue(page, 'białko');
    const fat2  = await readMacroValue(page, 'tłuszcze');
    const carb2 = await readMacroValue(page, 'węglowodany');

    expect(cal2).toBeCloseTo(cal1 * 2, 0);
    expect(prot2).toBeCloseTo(prot1 * 2, 0);
    expect(fat2).toBeCloseTo(fat1 * 2, 0);
    expect(carb2).toBeCloseTo(carb1 * 2, 0);
  });

  test('spaghetti + owsianka (ten sam dzień, 2 sloty) → składniki z obu bez duplikatów', async ({ page }) => {
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlanV2(page, [
      { date: '2026-08-11', recipeIds: ['spaghetti-bolognese', 'owsianka-z-bananem'] },
    ]);
    await page.reload();
    await waitForShoppingContent(page);

    const assertItem = async (name: string, qty: string) => {
      const row = page.locator('ul li').filter({ hasText: name });
      await expect(row, `${name}: oczekiwano ${qty}`).toContainText(qty);
    };

    await assertItem('Makaron spaghetti',  '200 g');
    await assertItem('Mięso mielone wołowe', '300 g');
    await assertItem('Płatki owsiane', '80 g');
    await assertItem('Mleko',          '200 ml');
    await assertItem('Banan',          '1 szt');

    // Brak duplikatów
    const allNames = await page
      .locator('ul li label span:first-child')
      .allTextContents();
    const trimmed = allNames.map((n) => n.trim()).filter(Boolean);
    const unique = new Set(trimmed);
    expect(unique.size).toBe(trimmed.length);
  });

  test('ten sam składnik w 2 przepisach różnych dni → jedna zsumowana pozycja', async ({ page }) => {
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlanV2(page, [
      { date: '2026-08-11', recipeIds: ['zupa-pomidorowa'] },
      { date: '2026-08-12', recipeIds: ['zupa-jarzynowa'] },
    ]);
    await page.reload();
    await waitForShoppingContent(page);

    const cebula = page.locator('ul li').filter({ hasText: 'Cebula' });
    await expect(cebula).toHaveCount(1);
    await expect(cebula).toContainText('2 szt');
  });

  test('kolejność kategorii zgodna z CATEGORY_ORDER', async ({ page }) => {
    await page.goto('/mokoszo/lista-zakupow/');
    await setPlanV2(page, [
      { date: '2026-08-11', recipeIds: ['spaghetti-bolognese', 'owsianka-z-bananem'] },
    ]);
    await page.reload();
    await waitForShoppingContent(page);

    const catHeaders = await page
      .locator('section > div > button span:first-child')
      .allTextContents();

    const ORDER = ['Warzywa', 'Owoce', 'Mięso', 'Nabiał', 'Zboża', 'Konserwy', 'Oleje', 'Przyprawy'];
    const expected = ORDER.filter((label) =>
      catHeaders.some((h) => h.includes(label))
    );
    const actual = catHeaders
      .map((h) => ORDER.find((label) => h.includes(label)))
      .filter(Boolean) as string[];

    expect(actual).toEqual(expected);
  });
});
