import { test, expect } from '@playwright/test';

const SLUG = 'spaghetti-bolognese';
const RECIPE_URL = `/mokoszo/przepis/${SLUG}/`;

test.describe('Widok szczegółowy przepisu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(RECIPE_URL);
  });

  test('wyświetla tytuł przepisu', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Spaghetti Bolognese');
    await expect(page).toHaveTitle(/Spaghetti Bolognese/);
  });

  test('wyświetla czas i liczbę porcji', async ({ page }) => {
    await expect(page.locator('text=40 min')).toBeVisible();
    await expect(page.locator('text=porcj')).toBeVisible();
  });

  test('wyświetla co najmniej 4 składniki', async ({ page }) => {
    const count = await page.locator('aside li').count();
    expect(count).toBeGreaterThan(3);
  });

  test('każdy składnik ma nazwę i ilość', async ({ page }) => {
    const firstRow = page.locator('aside li').first();
    const spans = firstRow.locator('span');
    await expect(spans.first()).toBeVisible();
    await expect(spans.last()).toBeVisible();
  });

  test('wyświetla wartości odżywcze (kcal, białko, tłuszcze, węgle)', async ({ page }) => {
    await expect(page.locator('text=kcal').first()).toBeVisible();
    await expect(page.locator('text=białko')).toBeVisible();
    await expect(page.locator('text=tłuszcze')).toBeVisible();
    await expect(page.locator('text=węglowodany')).toBeVisible();
  });

  test('wartości kaloryczne są liczbą > 0', async ({ page }) => {
    // Bierze pierwsze p.text-xl w sekcji makr (kalorie)
    const kcalEl = page.locator('.rounded-xl.bg-green-50 p.text-xl').first();
    const text = await kcalEl.textContent();
    const val = parseFloat(text ?? '0');
    expect(val).toBeGreaterThan(0);
  });

  test('wyświetla co najmniej 3 kroki przygotowania', async ({ page }) => {
    // Kroki renderują się jako h2 przez Markdown w article
    const count = await page.locator('article .recipe-content h2').count();
    expect(count).toBeGreaterThan(2);
  });

  test('breadcrumb prowadzi z powrotem na listę', async ({ page }) => {
    await page.getByRole('link', { name: 'Przepisy' }).click();
    await expect(page).toHaveURL('/mokoszo/');
  });

  test('nawigacja prowadzi do planu przez header', async ({ page }) => {
    await page.getByRole('link', { name: 'Plan' }).click();
    await expect(page).toHaveURL('/mokoszo/plan/');
  });

  test('smoke: wszystkie 10 przepisów ładuje się bez błędów', async ({ page }) => {
    const slugs = [
      'owsianka-z-bananem',
      'jajecznica-z-pomidorami',
      'nalesniki',
      'kanapki-z-twarogiem',
      'spaghetti-bolognese',
      'zupa-pomidorowa',
      'zupa-jarzynowa',
      'kurczak-w-sosie-smietanowym',
      'kurczak-z-warzywami-z-piekarnika',
      'salatka-grecka',
    ];

    for (const slug of slugs) {
      const response = await page.goto(`/mokoszo/przepis/${slug}/`);
      expect(response?.status(), `${slug}: nie-200`).toBe(200);
      await expect(
        page.getByRole('heading', { level: 1 }),
        `${slug}: brak h1`
      ).toBeVisible();
      const kcalCount = await page.locator('text=kcal').count();
      expect(kcalCount, `${slug}: brak makr`).toBeGreaterThan(0);
    }
  });
});
