import { test, expect, type Page } from '@playwright/test';

const HOME = '/mokoszo/';

/**
 * Czeka aż Alpine przetworzy x-show i pokaże pierwsze karty.
 * Karty startują z style="display:none", Alpine usuwa to gdy shouldShow(i) === true.
 */
async function waitForCards(page: Page) {
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('.grid > div')).some(
        (el) => window.getComputedStyle(el).display !== 'none'
      ),
    { timeout: 10_000 }
  );
}

/** Zwraca liczbę aktualnie widocznych kart w siatce. */
async function visibleCardCount(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.grid > div')).filter(
      (el) => window.getComputedStyle(el).display !== 'none'
    ).length
  );
}

test.describe('Lista przepisów (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(HOME);
    await waitForCards(page);
  });

  test('wyświetla tytuł strony i nagłówek', async ({ page }) => {
    await expect(page).toHaveTitle(/Przepisy.*Mokoszo/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Przepisy');
  });

  test('na stronie 1 widoczne jest 6 kart (10 przepisów total)', async ({ page }) => {
    const count = await visibleCardCount(page);
    expect(count).toBe(6);
  });

  test('każda widoczna karta ma tytuł, tag i czas', async ({ page }) => {
    const firstCard = page.locator('.grid > div').filter({ visible: true }).first().locator('a');
    await expect(firstCard.getByRole('heading')).toBeVisible();
    await expect(firstCard.locator('span.text-green-700').first()).toBeVisible();
    await expect(firstCard).toContainText('min');
  });

  test('klik w kartę prowadzi do widoku szczegółowego', async ({ page }) => {
    await page.locator('.grid > div').filter({ visible: true }).first().locator('a').click();
    await expect(page).toHaveURL(/\/mokoszo\/przepis\/.+\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('filtrowanie po "śniadanie" zmniejsza liczbę widocznych kart', async ({ page }) => {
    const before = await visibleCardCount(page);

    await page.getByRole('button', { name: 'śniadanie' }).click();
    await page.waitForFunction(
      (prevCount: number) =>
        Array.from(document.querySelectorAll('.grid > div')).filter(
          (el) => window.getComputedStyle(el).display !== 'none'
        ).length !== prevCount,
      before,
      { timeout: 5_000 }
    );

    const after = await visibleCardCount(page);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  });

  test('filtrowanie po "śniadanie" pokazuje tylko karty z tym tagiem', async ({ page }) => {
    await page.getByRole('button', { name: 'śniadanie' }).click();
    await page.waitForTimeout(300);

    const visibleCards = page.locator('.grid > div').filter({ visible: true }).locator('a');
    const count = await visibleCards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      // allTextContents() zwraca stringi z białymi znakami — trimujemy przed porównaniem
      const tags = (await visibleCards.nth(i).locator('span.text-green-700').allTextContents())
        .map((t) => t.trim());
      expect(tags.some((t) => t.includes('śniadanie'))).toBe(true);
    }
  });

  test('wielokrotne filtry działają addytywnie', async ({ page }) => {
    await page.getByRole('button', { name: 'śniadanie' }).click();
    await page.waitForTimeout(200);
    const sniadanieCount = await visibleCardCount(page);

    await page.getByRole('button', { name: 'obiad' }).click();
    await page.waitForTimeout(200);
    const bothCount = await visibleCardCount(page);

    expect(bothCount).toBeGreaterThanOrEqual(sniadanieCount);
  });

  test('"Wyczyść filtry" przywraca 6 kart', async ({ page }) => {
    await page.getByRole('button', { name: 'śniadanie' }).click();
    await page.waitForTimeout(200);

    // Przycisk Wyczyść staje się widoczny po zaznaczeniu filtra
    const clearBtn = page.getByRole('button', { name: 'Wyczyść filtry' });
    await clearBtn.waitFor({ state: 'visible', timeout: 3_000 });
    await clearBtn.click();
    await page.waitForTimeout(200);

    const count = await visibleCardCount(page);
    expect(count).toBe(6);
  });

  test('paginacja: "Następna strona" przechodzi na stronę 2', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: 'Następna strona' });
    await nextBtn.waitFor({ state: 'visible', timeout: 3_000 });
    await nextBtn.click();

    // Weryfikacja: "Poprzednia strona" jest aktywna → faktycznie jesteśmy na str. ≥ 2
    const prevBtn = page.getByRole('button', { name: 'Poprzednia strona' });
    await expect(prevBtn).toBeEnabled({ timeout: 5_000 });

    // Strona 2 musi mieć co najmniej 1 kartę
    const count = await visibleCardCount(page);
    expect(count).toBeGreaterThan(0);
  });

  test('zmiana filtra resetuje do strony 1', async ({ page }) => {
    // Idź na stronę 2
    await page.getByRole('button', { name: 'Następna strona' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Następna strona' }).click();
    await page.waitForTimeout(200);

    // Włącz filtr → reset do str. 1
    await page.getByRole('button', { name: 'śniadanie' }).click();
    await page.waitForTimeout(300);

    // Po filtrze jesteśmy na str. 1:
    // - albo paginacja jest ukryta (totalPages=1) → "←" nie istnieje w DOM
    // - albo "←" istnieje i jest disabled
    // W obu przypadkach jesteśmy na str. 1.
    const prevBtn = page.getByRole('button', { name: 'Poprzednia strona' });
    const exists = (await prevBtn.count()) > 0;
    if (exists) {
      await expect(prevBtn).toBeDisabled();
    }
    // brak przycisku oznacza paginację ukrytą (1 strona) — też poprawny stan
  });
});
