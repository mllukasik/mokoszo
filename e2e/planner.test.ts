import { test, expect, type Page } from '@playwright/test';

const PLAN_URL = '/mokoszo/plan/';

/**
 * Czeka aż Alpine wykona x-for i doda karty dni do DOM.
 * Przed Alpine-init siatka jest pusta (karty żyją w <template x-for>).
 */
async function waitForDays(page: Page, expected = 3) {
  await page.waitForFunction(
    (n: number) => document.querySelectorAll('[x-data] .grid > div.flex').length === n,
    expected,
    { timeout: 10_000 }
  );
}

/** Zlicza karty dni w DOM. */
async function dayCardCount(page: Page) {
  return page.evaluate(
    () => document.querySelectorAll('[x-data] .grid > div.flex').length
  );
}

test.describe('Planer jadłospisu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAN_URL);
    // Wyczyść localStorage i odświeź — pewny stan testowy
    await page.evaluate(() => localStorage.removeItem('mokoszo:meal-plan:v1'));
    await page.reload();
    await waitForDays(page, 3);
  });

  test('wyświetla nagłówek strony', async ({ page }) => {
    await expect(page).toHaveTitle(/Plan jadłospisu/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Plan jadłospisu');
  });

  test('domyślnie wyświetla 3 karty dni', async ({ page }) => {
    expect(await dayCardCount(page)).toBe(3);
  });

  test('"+" zwiększa liczbę dni do 4', async ({ page }) => {
    await page.getByRole('button', { name: 'Zwiększ liczbę dni' }).click();
    await waitForDays(page, 4);
    expect(await dayCardCount(page)).toBe(4);
  });

  test('"−" zmniejsza liczbę dni do 2', async ({ page }) => {
    await page.getByRole('button', { name: 'Zmniejsz liczbę dni' }).click();
    await waitForDays(page, 2);
    expect(await dayCardCount(page)).toBe(2);
  });

  test('"−" jest wyłączony przy 1 dniu', async ({ page }) => {
    const minusBtn = page.getByRole('button', { name: 'Zmniejsz liczbę dni' });
    await minusBtn.click(); // 3 → 2
    await waitForDays(page, 2);
    await minusBtn.click(); // 2 → 1
    await waitForDays(page, 1);
    await expect(minusBtn).toBeDisabled();
  });

  test('wybór przepisu pojawia się na liście wybranych w danym dniu', async ({ page }) => {
    const firstCard = page.locator('[x-data] .grid > div.flex').first();
    const recipePill = firstCard.getByRole('button').first();
    const recipeName = (await recipePill.textContent())!.trim();

    await recipePill.click();
    await page.waitForTimeout(300);

    // Checkmark i tytuł powinny się pojawić
    await expect(firstCard.locator('text=✓')).toBeVisible();
    await expect(firstCard).toContainText(recipeName);
  });

  test('wybrany przepis można odznaczyć', async ({ page }) => {
    const firstCard = page.locator('[x-data] .grid > div.flex').first();
    const btn = firstCard.getByRole('button').first();

    await btn.click(); // zaznacz
    await page.waitForTimeout(200);
    await btn.click(); // odznacz
    await page.waitForTimeout(200);

    await expect(firstCard.locator('text=✓')).not.toBeVisible();
    await expect(firstCard.locator('text=Brak wybranych przepisów')).toBeVisible();
  });

  test('plan persystuje po odświeżeniu strony', async ({ page }) => {
    const firstCard = page.locator('[x-data] .grid > div.flex').first();
    const btn = firstCard.getByRole('button').first();
    const recipeName = (await btn.textContent())!.trim();

    await btn.click();
    await page.waitForTimeout(300);

    await page.reload();
    await waitForDays(page, 3);

    const reloaded = page.locator('[x-data] .grid > div.flex').first();
    await expect(reloaded.locator('text=✓')).toBeVisible();
    await expect(reloaded).toContainText(recipeName);
  });

  test('CTA do listy zakupów pojawia się po wybraniu przepisu', async ({ page }) => {
    // Targetujemy konkretnie CTA w <main> (nie link w nawigacji)
    const cta = page.locator('main a[href*="lista-zakupow"]');
    await expect(cta).not.toBeVisible();

    await page.locator('[x-data] .grid > div.flex').first().getByRole('button').first().click();
    await page.waitForTimeout(300);

    await expect(cta).toBeVisible();
  });

  test('"Wyczyść plan" usuwa wszystkie wybory', async ({ page }) => {
    // Zaznacz przepis
    await page.locator('[x-data] .grid > div.flex').first().getByRole('button').first().click();
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: 'Wyczyść plan' }).click();
    await page.waitForTimeout(300);

    const allCards = page.locator('[x-data] .grid > div.flex');
    const count = await allCards.count();
    for (let i = 0; i < count; i++) {
      await expect(allCards.nth(i).locator('text=Brak wybranych przepisów')).toBeVisible();
    }
  });

  test('zwiększenie dni zachowuje istniejące wybory', async ({ page }) => {
    const firstCard = page.locator('[x-data] .grid > div.flex').first();
    const btn = firstCard.getByRole('button').first();
    const recipeName = (await btn.textContent())!.trim();

    await btn.click();
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: 'Zwiększ liczbę dni' }).click();
    await waitForDays(page, 4);

    // Dzień 1 wciąż ma wybrany przepis
    await expect(page.locator('[x-data] .grid > div.flex').first()).toContainText(recipeName);
  });
});
