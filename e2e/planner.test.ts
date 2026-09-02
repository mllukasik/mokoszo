/**
 * Testy plannera jadłospisu — nowy UX (issue #9):
 *   - lista dni (widok 'list') — flat list, per-date days
 *   - dodawanie dnia (inline form)
 *   - edytor dnia ze slotami posiłków (widok 'edit')
 *   - Tinder-like picker przepisów (widok 'pick')
 */
import { test, expect, type Page } from '@playwright/test';

const PLAN_URL = '/mokoszo/plan/';
const DAYS_KEY = 'mokoszo:days:v3';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function clearDays(page: Page) {
  await page.evaluate((key) => localStorage.removeItem(key), DAYS_KEY);
}

/** Saves v3 days to localStorage — each spec entry becomes a day with 3 default slots */
async function setDaysV3(page: Page, days: { date: string; recipeIds?: string[] }[]) {
  const v3 = {
    version: 3,
    days: days.map((d, di) => ({
      date: d.date,
      slots: [
        { id: `s-${di}-0`, name: 'śniadanie', recipeId: (d.recipeIds ?? [])[0] ?? null, isCustom: false },
        { id: `s-${di}-1`, name: 'obiad',     recipeId: (d.recipeIds ?? [])[1] ?? null, isCustom: false },
        { id: `s-${di}-2`, name: 'kolacja',   recipeId: (d.recipeIds ?? [])[2] ?? null, isCustom: false },
      ],
    })),
  };
  await page.evaluate(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: DAYS_KEY, data: v3 }
  );
}

/** Czeka aż widok listy dni jest aktywny ("+ Dodaj dzień" widoczny). */
async function waitForListView(page: Page) {
  await page.waitForFunction(
    () => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '+ Dodaj dzień'
      );
      if (!btn) return false;
      return window.getComputedStyle(btn).display !== 'none';
    },
    { timeout: 10_000 }
  );
}

/** Czeka aż widok edytora jest aktywny ("← Wszystkie dni" widoczny). */
async function waitForEditView(page: Page) {
  await page.waitForFunction(
    () => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '← Wszystkie dni'
      );
      if (!btn) return false;
      return window.getComputedStyle(btn).display !== 'none';
    },
    { timeout: 10_000 }
  );
}

/** Czeka aż widok pickera jest aktywny ("← Wróć do dnia" widoczny). */
async function waitForPickView(page: Page) {
  await page.getByRole('button', { name: '← Wróć do dnia' }).waitFor({
    state: 'visible',
    timeout: 8_000,
  });
}

/**
 * Dodaje dzień przez UI (formularz).
 * Przechodzi automatycznie do widoku edytora.
 */
async function addDayViaUI(page: Page, date: string) {
  await page.getByRole('button', { name: '+ Dodaj dzień' }).first().click();
  await page.locator('#new-day-date').waitFor({ state: 'visible', timeout: 5_000 });
  await page.fill('#new-day-date', date);
  await page.getByRole('button', { name: 'Dodaj' }).click();
  await waitForEditView(page);
}

/**
 * Klika "+ wybierz przepis" dla pierwszego pustego slotu,
 * czeka na picker, klika "Wszystkie", wybiera bieżącą kartę, wraca do edytora.
 * Zwraca tytuł wybranego przepisu.
 */
async function pickFirstRecipe(page: Page): Promise<string> {
  await page.getByText('+ wybierz przepis').first().click();
  await waitForPickView(page);

  // Kliknij "Wszystkie" żeby mieć pełną listę
  await page.getByRole('button', { name: 'Wszystkie' }).click();

  // Pobierz tytuł bieżącej karty (Tinder-style: jedna karta na raz)
  const cardTitle = page.locator('.rounded-2xl h3').first();
  await cardTitle.waitFor({ state: 'visible', timeout: 5_000 });
  const recipeName = (await cardTitle.textContent())!.trim();

  // Kliknij "+ Dodaj"
  await page.getByRole('button', { name: /\+ Dodaj/ }).click();
  await waitForEditView(page);
  return recipeName;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Planer — widok listy dni', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAN_URL);
    await clearDays(page);
    await page.reload();
    await waitForListView(page);
  });

  test('wyświetla tytuł strony', async ({ page }) => {
    await expect(page).toHaveTitle(/Plan jadłospisu/);
  });

  test('wyświetla nagłówek "Plan jadłospisu"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Plan jadłospisu');
  });

  test('wyświetla stan pusty gdy brak dni', async ({ page }) => {
    await expect(page.getByText('Brak zaplanowanych dni')).toBeVisible();
  });

  test('przycisk "+ Dodaj dzień" jest widoczny', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+ Dodaj dzień' }).first()).toBeVisible();
  });
});

test.describe('Planer — dodawanie dnia', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAN_URL);
    await clearDays(page);
    await page.reload();
    await waitForListView(page);
  });

  test('kliknięcie "+ Dodaj dzień" pokazuje formularz z polem daty', async ({ page }) => {
    await page.getByRole('button', { name: '+ Dodaj dzień' }).first().click();
    await expect(page.locator('#new-day-date')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dodaj' })).toBeVisible();
  });

  test('"Anuluj" chowa formularz', async ({ page }) => {
    await page.getByRole('button', { name: '+ Dodaj dzień' }).first().click();
    await page.locator('#new-day-date').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Anuluj' }).click();
    await expect(page.locator('#new-day-date')).not.toBeVisible();
  });

  test('po dodaniu dnia → otwiera edytor', async ({ page }) => {
    await addDayViaUI(page, '2026-08-12');
    // Edit view is now active
    await expect(page.getByRole('button', { name: '← Wszystkie dni' })).toBeVisible();
  });

  test('edytor nowego dnia ma 3 domyślne sloty: śniadanie, obiad, kolacja', async ({ page }) => {
    await addDayViaUI(page, '2026-08-12');
    await expect(page.locator('.space-y-2')).toContainText('śniadanie');
    await expect(page.locator('.space-y-2')).toContainText('obiad');
    await expect(page.locator('.space-y-2')).toContainText('kolacja');
  });

  test('po powrocie do listy dzień pojawia się w liście', async ({ page }) => {
    await addDayViaUI(page, '2026-08-12');
    await page.getByRole('button', { name: '← Wszystkie dni' }).click();
    await waitForListView(page);
    // Day row exists — data nie musi być po polsku, wystarczy przycisk "Edytuj"
    await expect(page.getByRole('button', { name: 'Edytuj' }).first()).toBeVisible();
  });

  test('link "Idź do listy zakupów" widoczny gdy są dni', async ({ page }) => {
    await addDayViaUI(page, '2026-08-12');
    await page.getByRole('button', { name: '← Wszystkie dni' }).click();
    await waitForListView(page);
    await expect(page.getByRole('link', { name: /lista zakupów/i }).first()).toBeVisible();
  });
});

test.describe('Planer — edytor dnia', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAN_URL);
    await clearDays(page);
    await page.reload();
    await waitForListView(page);
    await addDayViaUI(page, '2026-08-12');
  });

  test('kliknięcie "+ wybierz przepis" otwiera picker', async ({ page }) => {
    await page.getByText('+ wybierz przepis').first().click();
    await waitForPickView(page);
    await expect(page.locator('h1').filter({ visible: true })).toContainText('Co na');
  });

  test('picker prefiltruje po nazwie slotu (śniadanie)', async ({ page }) => {
    await page.getByText('+ wybierz przepis').first().click();
    await waitForPickView(page);
    // Filtr śniadanie powinien być aktywny (bg-gray-800)
    const sniadanieBtn = page.locator('button.rounded-full', { hasText: /^śniadanie$/ });
    await expect(sniadanieBtn.first()).toHaveClass(/bg-gray-800/);
  });

  test('"← Wróć do dnia" w pickerze cofa do edytora bez zmiany', async ({ page }) => {
    await page.getByText('+ wybierz przepis').first().click();
    await waitForPickView(page);
    await page.getByRole('button', { name: '← Wróć do dnia' }).click();
    await waitForEditView(page);
    // Slot nadal pusty
    await expect(page.getByText('+ wybierz przepis').first()).toBeVisible();
  });

  test('można wybrać przepis przez picker', async ({ page }) => {
    const recipeName = await pickFirstRecipe(page);
    // Wybrany przepis pojawia się w slocie
    await expect(page.locator('.space-y-2')).toContainText(recipeName);
    // Jeden slot ma przepis, 2 pozostałe mają "+ wybierz przepis"
    expect(await page.getByText('+ wybierz przepis').count()).toBe(2);
  });

  test('wybrany przepis pokazuje checkmark w pickerze gdy ponownie otwarty', async ({ page }) => {
    await pickFirstRecipe(page);
    // Otwórz picker dla tego samego slotu przez "zmień"
    await page.getByRole('button', { name: 'zmień' }).first().click();
    await waitForPickView(page);
    // Przełącz na "Wszystkie" — bieżąca karta to wybrany przepis
    await page.getByRole('button', { name: 'Wszystkie' }).click();
    // Checkmark (.bg-green-500) widoczny
    await expect(page.locator('.bg-green-500').first()).toBeVisible();
  });

  test('wybrany przepis można wyczyścić (✕)', async ({ page }) => {
    await pickFirstRecipe(page);
    await page.waitForTimeout(200);
    // Wyczyść przez ✕ (aria-label="Usuń przepis")
    await page.getByRole('button', { name: 'Usuń przepis' }).first().click();
    await page.waitForTimeout(200);
    // Slot znów pokazuje "+ wybierz przepis"
    await expect(page.getByText('+ wybierz przepis').first()).toBeVisible();
  });

  test('filtr "Wszystkie" w pickerze — pokazuje wszystkie przepisy', async ({ page }) => {
    await page.getByText('+ wybierz przepis').first().click();
    await waitForPickView(page);
    // Kliknij "Wszystkie"
    await page.getByRole('button', { name: 'Wszystkie' }).click();
    // Przycisk "Wszystkie" jest aktywny
    await expect(page.getByRole('button', { name: 'Wszystkie' })).toHaveClass(/bg-gray-800/);
    // Karta przepisu widoczna
    await expect(page.locator('.rounded-2xl h3').first()).toBeVisible();
  });

  test('można dodać własny slot w dniu', async ({ page }) => {
    const slotsBefore = await page.locator('.space-y-2 > div.rounded-lg').count();
    await page.getByRole('button', { name: '+ Dodaj posiłek' }).click();
    await page.waitForTimeout(200);
    const slotsAfter = await page.locator('.space-y-2 > div.rounded-lg').count();
    expect(slotsAfter).toBe(slotsBefore + 1);
    await expect(page.locator('.space-y-2 > div.rounded-lg').last()).toContainText('Własny posiłek');
  });

  test('własny slot można usunąć', async ({ page }) => {
    await page.getByRole('button', { name: '+ Dodaj posiłek' }).click();
    await page.waitForTimeout(200);
    const slotsBefore = await page.locator('.space-y-2 > div.rounded-lg').count();
    // Kliknij "Usuń" na ostatnim (własnym) slocie
    await page.locator('.space-y-2 > div.rounded-lg').last().getByRole('button', { name: 'Usuń' }).click();
    await page.waitForTimeout(200);
    const slotsAfter = await page.locator('.space-y-2 > div.rounded-lg').count();
    expect(slotsAfter).toBe(slotsBefore - 1);
  });

  test('plan persystuje po odświeżeniu strony', async ({ page }) => {
    const recipeName = await pickFirstRecipe(page);
    await page.waitForTimeout(300);

    await page.reload();
    await waitForListView(page);

    // Otwórz dzień przez "Edytuj"
    await page.getByRole('button', { name: 'Edytuj' }).first().click();
    await waitForEditView(page);

    // Wybrany przepis jest zapamiętany
    await expect(page.locator('.space-y-2')).toContainText(recipeName);
  });

  test('link "Lista zakupów" widoczny w edytorze', async ({ page }) => {
    await expect(page.getByRole('link', { name: /lista zakupów/i }).first()).toBeVisible();
  });
});

test.describe('Planer — usuwanie dnia', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAN_URL);
    await clearDays(page);
    await page.reload();
    await waitForListView(page);
  });

  test('można usunąć dzień z listy', async ({ page }) => {
    await addDayViaUI(page, '2026-08-12');
    await page.getByRole('button', { name: '← Wszystkie dni' }).click();
    await waitForListView(page);

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Usuń dzień' }).first().click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Brak zaplanowanych dni')).toBeVisible();
  });

  test('można mieć wiele dni jednocześnie', async ({ page }) => {
    await addDayViaUI(page, '2026-08-12');
    await page.getByRole('button', { name: '← Wszystkie dni' }).click();
    await waitForListView(page);
    await addDayViaUI(page, '2026-09-01');
    await page.getByRole('button', { name: '← Wszystkie dni' }).click();
    await waitForListView(page);

    // 2 "Edytuj" buttons in the list
    const editBtns = page.getByRole('button', { name: 'Edytuj' });
    expect(await editBtns.count()).toBe(2);
  });
});
