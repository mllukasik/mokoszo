import { test, expect, type Page } from '@playwright/test';

const URL = '/mokoszo/lista-zakupow/';
const PLANS_KEY = 'mokoszo:plans:v2';

type DaySpec = { date: string; recipeIds: string[] };

/**
 * Tworzy i zapisuje plan v2 do localStorage.
 * recipeGroups to lista dni z przypisanymi przepisami (każdy przepis = osobny slot).
 */
async function setPlan(page: Page, days: DaySpec[]) {
  const planId = 'test-plan-1';
  const storage = {
    version: 2,
    plans: [
      {
        id: planId,
        days: days.map((g) => ({
          date: g.date,
          slots: g.recipeIds.map((id, i) => ({
            id: `s-${g.date}-${i}`,
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

async function clearPlan(page: Page) {
  await page.evaluate((key) => localStorage.removeItem(key), PLANS_KEY);
}

/** Czeka aż Alpine przetworzy shoppingListPage i pokaże odpowiedni widok. */
async function waitForContent(page: Page) {
  await page.waitForFunction(
    () => {
      const empty = document.querySelector('[x-show="isEmpty"]');
      const full  = document.querySelector('[x-show="!isEmpty"]');
      if (!empty || !full) return false;
      const eStyle = window.getComputedStyle(empty as HTMLElement).display;
      const fStyle = window.getComputedStyle(full as HTMLElement).display;
      return eStyle !== 'none' || fStyle !== 'none';
    },
    { timeout: 8_000 }
  );
}

// ─── Faza 6 ─────────────────────────────────────────────────────────────────

test.describe('Lista zakupów — T6.1', () => {
  test('wyświetla stan pusty gdy brak planu', async ({ page }) => {
    await page.goto(URL);
    await clearPlan(page);
    await page.reload();
    await waitForContent(page);

    await expect(page.locator('[x-show="isEmpty"]')).toBeVisible();
    await expect(page.locator('[x-show="!isEmpty"]')).not.toBeVisible();
  });

  test('stan pusty gdy plans:v2 nie ma activeForShopping', async ({ page }) => {
    await page.goto(URL);
    // Zapis planu bez activeForShopping
    await page.evaluate(
      ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
      {
        key: PLANS_KEY,
        data: { version: 2, plans: [], activeForShopping: null },
      }
    );
    await page.reload();
    await waitForContent(page);

    await expect(page.locator('[x-show="isEmpty"]')).toBeVisible();
  });

  test('stan pusty zawiera link do /plan/', async ({ page }) => {
    await page.goto(URL);
    await clearPlan(page);
    await page.reload();
    await waitForContent(page);

    const link = page.locator('[x-show="isEmpty"] a[href*="plan"]');
    await expect(link).toBeVisible();
  });

  test('wyświetla zawartość gdy plan niepusty', async ({ page }) => {
    await page.goto(URL);
    await setPlan(page, [{ date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] }]);
    await page.reload();
    await waitForContent(page);

    await expect(page.locator('[x-show="!isEmpty"]')).toBeVisible();
    await expect(page.locator('[x-show="isEmpty"]')).not.toBeVisible();
  });

  test('wyświetla tytuł "Lista zakupów"', async ({ page }) => {
    await page.goto(URL);
    await setPlan(page, [{ date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] }]);
    await page.reload();
    await waitForContent(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Lista zakupów');
    await expect(page).toHaveTitle(/Lista zakupów/);
  });

  test('wyświetla nazwę planu (datę) jako podtytuł', async ({ page }) => {
    await page.goto(URL);
    await setPlan(page, [{ date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] }]);
    await page.reload();
    await waitForContent(page);

    // Podtytuł z datą planu
    await expect(page.locator('[x-show="!isEmpty"] p[x-show="planName"]')).toBeVisible();
  });
});

test.describe('Lista zakupów — T6.2 ShoppingList', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await setPlan(page, [
      { date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] },
    ]);
    await page.reload();
    await waitForContent(page);
  });

  test('wyświetla co najmniej 1 kategorię', async ({ page }) => {
    const cats = page.locator('section button').filter({ hasText: /\S+/ });
    const count = await cats.count();
    expect(count).toBeGreaterThan(0);
  });

  test('każda kategoria ma listę składników', async ({ page }) => {
    const items = page.locator('ul li');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('każdy składnik ma checkbox i nazwę i ilość', async ({ page }) => {
    const firstItem = page.locator('ul li').first();
    await expect(firstItem.locator('input[type="checkbox"]')).toBeVisible();
    // Dwa spany: nazwa + ilość
    const spans = firstItem.locator('label span');
    expect(await spans.count()).toBeGreaterThanOrEqual(2);
  });

  test('checkbox można zaznaczyć — tekst przekreślony', async ({ page }) => {
    const firstCheckbox = page.locator('ul li input[type="checkbox"]').first();
    const firstNameSpan = page.locator('ul li label span').first();

    await firstCheckbox.click();
    await page.waitForTimeout(200);

    await expect(firstNameSpan).toHaveClass(/line-through/);
  });

  test('checkbox można odznaczyć — przekreślenie znika', async ({ page }) => {
    const firstCheckbox = page.locator('ul li input[type="checkbox"]').first();
    const firstNameSpan = page.locator('ul li label span').first();

    await firstCheckbox.click(); // zaznacz
    await page.waitForTimeout(100);
    await firstCheckbox.click(); // odznacz
    await page.waitForTimeout(200);

    await expect(firstNameSpan).not.toHaveClass(/line-through/);
  });

  test('kategoria zwija się po kliknięciu nagłówka', async ({ page }) => {
    const catBtn = page.locator('section button').first();
    const ul = page.locator('section ul').first();

    await expect(ul).toBeVisible(); // domyślnie rozwinięta
    await catBtn.click();
    await page.waitForTimeout(200);
    await expect(ul).not.toBeVisible(); // zwinięta
  });

  test('kategoria rozija się po ponownym kliknięciu', async ({ page }) => {
    const catBtn = page.locator('section button').first();
    const ul = page.locator('section ul').first();

    await catBtn.click(); // zwiń
    await page.waitForTimeout(150);
    await catBtn.click(); // rozwiń
    await page.waitForTimeout(150);
    await expect(ul).toBeVisible();
  });

  test('ten sam składnik z 2 przepisów jest zsumowany (1 wpis)', async ({ page }) => {
    // zupa-pomidorowa i zupa-jarzynowa obie mają cebulę/marchewkę
    await setPlan(page, [
      { date: '2026-08-11', recipeIds: ['zupa-pomidorowa', 'zupa-jarzynowa'] },
    ]);
    await page.reload();
    await waitForContent(page);

    // Zbierz wszystkie nazwy składników na liście
    const names = await page.locator('ul li label span:first-child').allTextContents();
    const namesTrimmed = names.map((n) => n.trim());

    // Każda nazwa powinna wystąpić co najwyżej raz (suma, nie duplikaty)
    const uniqueNames = new Set(namesTrimmed);
    expect(uniqueNames.size).toBe(namesTrimmed.length);
  });
});

test.describe('Lista zakupów — T6.3 MacrosSummary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await setPlan(page, [{ date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] }]);
    await page.reload();
    await waitForContent(page);
  });

  test('wyświetla sekcję makr z 4 polami', async ({ page }) => {
    const macroCards = page.locator('.grid .rounded-xl');
    expect(await macroCards.count()).toBeGreaterThanOrEqual(4);
  });

  test('kalorie są > 0', async ({ page }) => {
    const kcalEl = page.locator('text=kcal').first().locator('..');
    const text = await kcalEl.locator('p.text-2xl').textContent();
    const val = parseFloat(text ?? '0');
    expect(val).toBeGreaterThan(0);
  });

  test('wyświetla białko, tłuszcze i węglowodany', async ({ page }) => {
    const macroSection = page.locator('section').first();
    await expect(macroSection.locator('text=białko')).toBeVisible();
    await expect(macroSection.getByText('tłuszcze', { exact: true })).toBeVisible();
    await expect(macroSection.locator('text=węglowodany')).toBeVisible();
  });

  test('makra są zaokrąglone — max 1 miejsce po przecinku', async ({ page }) => {
    const values = await page.locator('p.text-2xl').allTextContents();
    for (const v of values) {
      const num = v.replace(/[^\d.]/g, '');
      if (!num) continue;
      const decimalPart = num.split('.')[1];
      expect((decimalPart?.length ?? 0) <= 1).toBe(true);
    }
  });
});
