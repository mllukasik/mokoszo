/**
 * Testy plannera jadłospisu — nowy UX (v2):
 *   - lista planów (widok 'list')
 *   - tworzenie planu z zakresem dat (widok 'create')
 *   - edytor dni i posiłków (widok 'edit')
 */
import { test, expect, type Page } from '@playwright/test';

const PLAN_URL = '/mokoszo/plan/';
const PLANS_KEY = 'mokoszo:plans:v2';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function clearPlans(page: Page) {
  await page.evaluate((key) => localStorage.removeItem(key), PLANS_KEY);
}

/** Czeka aż Alpine renderuje widok listy planów (x-cloak zdejmuje ukrycie). */
async function waitForListView(page: Page) {
  await page.waitForFunction(
    () => {
      // Przycisk "Nowy plan" jest widoczny gdy view === 'list'
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '+ Nowy plan'
      );
      if (!btn) return false;
      return window.getComputedStyle(btn).display !== 'none';
    },
    { timeout: 10_000 }
  );
}

/** Czeka aż widok tworzenia planu jest widoczny. */
async function waitForCreateView(page: Page) {
  await page.waitForSelector('#plan-start', { state: 'visible', timeout: 8_000 });
}

/** Czeka aż widok edytora jest widoczny i ma co najmniej `n` kart dni. */
async function waitForEditView(page: Page, minDays = 1) {
  await page.waitForFunction(
    (n: number) => {
      // Przycisk "← Plany" jest obecny tylko w edytorze
      const back = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '← Plany'
      );
      if (!back || window.getComputedStyle(back).display === 'none') return false;
      // Karty dni (rounded-xl w .space-y-4)
      const cards = document.querySelectorAll('.space-y-4 > div.rounded-xl');
      return cards.length >= n;
    },
    minDays,
    { timeout: 10_000 }
  );
}

/** Tworzy plan przez UI. Zwraca po przejściu do widoku edytora. */
async function createPlanViaUI(page: Page, start: string, end: string) {
  await page.getByRole('button', { name: '+ Nowy plan' }).click();
  await waitForCreateView(page);
  await page.fill('#plan-start', start);
  await page.fill('#plan-end', end);
  await page.getByRole('button', { name: 'Utwórz plan' }).click();
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Planer — widok listy planów', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAN_URL);
    await clearPlans(page);
    await page.reload();
    await waitForListView(page);
  });

  test('wyświetla tytuł strony', async ({ page }) => {
    await expect(page).toHaveTitle(/Plan jadłospisu/);
  });

  test('wyświetla nagłówek "Moje plany"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Moje plany');
  });

  test('wyświetla stan pusty gdy brak planów', async ({ page }) => {
    await expect(page.getByText('Brak planów')).toBeVisible();
  });

  test('przycisk "Nowy plan" jest widoczny', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+ Nowy plan' })).toBeVisible();
  });
});

test.describe('Planer — tworzenie nowego planu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAN_URL);
    await clearPlans(page);
    await page.reload();
    await waitForListView(page);
  });

  test('kliknięcie "Nowy plan" pokazuje formularz z polami dat', async ({ page }) => {
    await page.getByRole('button', { name: '+ Nowy plan' }).click();
    await waitForCreateView(page);

    await expect(page.locator('#plan-start')).toBeVisible();
    await expect(page.locator('#plan-end')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Utwórz plan' })).toBeVisible();
  });

  test('"Wróć" cofa do listy planów', async ({ page }) => {
    await page.getByRole('button', { name: '+ Nowy plan' }).click();
    await waitForCreateView(page);
    await page.getByRole('button', { name: '← Wróć' }).click();
    await waitForListView(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Moje plany');
  });

  test('formularz pokazuje liczbę dni dla wybranego zakresu', async ({ page }) => {
    await page.getByRole('button', { name: '+ Nowy plan' }).click();
    await waitForCreateView(page);
    await page.fill('#plan-start', '2026-08-12');
    await page.fill('#plan-end', '2026-08-14');
    // Powinno pokazać "Plan obejmie 3 dni."
    await expect(page.getByText('3 dni')).toBeVisible();
  });

  test('błąd gdy data końcowa wcześniejsza niż początkowa', async ({ page }) => {
    await page.getByRole('button', { name: '+ Nowy plan' }).click();
    await waitForCreateView(page);
    await page.fill('#plan-start', '2026-08-14');
    await page.fill('#plan-end', '2026-08-12');
    await expect(page.getByText('Data końcowa musi być po dacie')).toBeVisible();
  });

  test('tworzenie 3-dniowego planu → edytor z 3 kartami dni', async ({ page }) => {
    await createPlanViaUI(page, '2026-08-12', '2026-08-14');
    await waitForEditView(page, 3);

    const dayCounts = await page.locator('.space-y-4 > div.rounded-xl').count();
    expect(dayCounts).toBe(3);
  });

  test('każda karta dnia ma 3 domyślne sloty: śniadanie, obiad, kolacja', async ({ page }) => {
    await createPlanViaUI(page, '2026-08-12', '2026-08-12');
    await waitForEditView(page, 1);

    const firstDay = page.locator('.space-y-4 > div.rounded-xl').first();
    await expect(firstDay).toContainText('śniadanie');
    await expect(firstDay).toContainText('obiad');
    await expect(firstDay).toContainText('kolacja');
  });

  test('plan pojawia się na liście po powrocie do "Plany"', async ({ page }) => {
    await createPlanViaUI(page, '2026-08-12', '2026-08-13');
    await waitForEditView(page, 2);
    await page.getByRole('button', { name: '← Plany' }).click();
    await waitForListView(page);

    // Karta planu powinna być widoczna (szuka daty w krótkim formacie)
    await expect(page.locator('.grid > div').filter({ hasText: 'sie' }).first()).toBeVisible();
  });
});

test.describe('Planer — edytor planu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAN_URL);
    await clearPlans(page);
    await page.reload();
    await waitForListView(page);
    await createPlanViaUI(page, '2026-08-12', '2026-08-14');
    await waitForEditView(page, 3);
  });

  test('nagłówek edytora pokazuje zakres dat planu', async ({ page }) => {
    // h1 w edytorze powinien zawierać krótki format daty
    const heading = page.locator('h1').filter({ visible: true });
    await expect(heading).toContainText('sie');
  });

  test('można wybrać przepis dla slotu śniadanie w dniu 1', async ({ page }) => {
    const firstDay = page.locator('.space-y-4 > div.rounded-xl').first();

    // Kliknij "wybierz przepis" w pierwszym slocie (śniadanie)
    await firstDay.getByText('+ wybierz przepis').first().click();

    // Pojawi się picker z przepisami
    const picker = firstDay.locator('.flex.flex-wrap.gap-1\\.5');
    await expect(picker.first()).toBeVisible();

    // Kliknij pierwszy przepis w pickerze
    const firstRecipeBtn = picker.first().getByRole('button').first();
    const recipeName = (await firstRecipeBtn.textContent())!.trim();
    await firstRecipeBtn.click();

    // Wybrany przepis pojawia się w slocie
    await expect(firstDay).toContainText(recipeName);
  });

  test('wybrany przepis można wyczyścić (✕)', async ({ page }) => {
    const firstDay = page.locator('.space-y-4 > div.rounded-xl').first();

    // Wybierz przepis
    await firstDay.getByText('+ wybierz przepis').first().click();
    await firstDay.locator('.flex.flex-wrap.gap-1\\.5').first().getByRole('button').first().click();
    await page.waitForTimeout(200);

    // Wyczyść przez ✕
    await firstDay.getByRole('button', { name: 'Usuń przepis' }).first().click();
    await page.waitForTimeout(200);

    // Slot znów pokazuje "+ wybierz przepis"
    await expect(firstDay.getByText('+ wybierz przepis').first()).toBeVisible();
  });

  test('można dodać własny slot w dniu 1', async ({ page }) => {
    const firstDay = page.locator('.space-y-4 > div.rounded-xl').first();
    const slotsBefore = await firstDay.locator('.space-y-2 > div.rounded-lg').count();

    await firstDay.getByRole('button', { name: '+ Dodaj posiłek' }).click();
    await page.waitForTimeout(200);

    const slotsAfter = await firstDay.locator('.space-y-2 > div.rounded-lg').count();
    expect(slotsAfter).toBe(slotsBefore + 1);

    // Nowy slot zawiera tekst "Własny posiłek"
    await expect(firstDay.locator('.space-y-2 > div.rounded-lg').last()).toContainText(
      'Własny posiłek'
    );
  });

  test('własny slot można usunąć', async ({ page }) => {
    const firstDay = page.locator('.space-y-4 > div.rounded-xl').first();
    await firstDay.getByRole('button', { name: '+ Dodaj posiłek' }).click();
    await page.waitForTimeout(200);

    const slotsBefore = await firstDay.locator('.space-y-2 > div.rounded-lg').count();

    await firstDay.getByRole('button', { name: 'Usuń posiłek' }).last().click();
    await page.waitForTimeout(200);

    const slotsAfter = await firstDay.locator('.space-y-2 > div.rounded-lg').count();
    expect(slotsAfter).toBe(slotsBefore - 1);
  });

  test('plan persystuje po odświeżeniu strony', async ({ page }) => {
    const firstDay = page.locator('.space-y-4 > div.rounded-xl').first();
    await firstDay.getByText('+ wybierz przepis').first().click();
    const recipePill = firstDay.locator('.flex.flex-wrap.gap-1\\.5').first().getByRole('button').first();
    const recipeName = (await recipePill.textContent())!.trim();
    await recipePill.click();
    await page.waitForTimeout(300);

    await page.reload();
    // Po przeładowaniu: lista planów (Alpine resetuje view do 'list')
    await waitForListView(page);

    // Plan jest na liście — możemy go otworzyć
    await page.locator('.grid > div').filter({ hasText: 'sie' }).first()
      .getByRole('button', { name: 'Edytuj' }).click();
    await waitForEditView(page, 3);

    // Wybrany przepis jest zapamiętany
    await expect(page.locator('.space-y-4 > div.rounded-xl').first()).toContainText(recipeName);
  });

  test('przycisk "Lista zakupów" wyłączony gdy brak przepisów', async ({ page }) => {
    const shoppingBtn = page.getByRole('button', { name: '🛒 Lista zakupów' });
    await expect(shoppingBtn).toBeDisabled();
  });

  test('przycisk "Lista zakupów" aktywny po wybraniu przepisu', async ({ page }) => {
    const firstDay = page.locator('.space-y-4 > div.rounded-xl').first();
    await firstDay.getByText('+ wybierz przepis').first().click();
    await firstDay.locator('.flex.flex-wrap.gap-1\\.5').first().getByRole('button').first().click();
    await page.waitForTimeout(200);

    const shoppingBtn = page.getByRole('button', { name: '🛒 Lista zakupów' });
    await expect(shoppingBtn).toBeEnabled();
  });
});

test.describe('Planer — usuwanie i wiele planów', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAN_URL);
    await clearPlans(page);
    await page.reload();
    await waitForListView(page);
  });

  test('można usunąć plan z listy', async ({ page }) => {
    // Utwórz plan
    await createPlanViaUI(page, '2026-08-12', '2026-08-12');
    await waitForEditView(page, 1);
    await page.getByRole('button', { name: '← Plany' }).click();
    await waitForListView(page);

    // Usuń
    page.on('dialog', (dialog) => dialog.accept()); // confirm() → OK
    await page.locator('.grid > div').first().getByRole('button', { name: 'Usuń' }).click();
    await page.waitForTimeout(300);

    // Lista pusta
    await expect(page.getByText('Brak planów')).toBeVisible();
  });

  test('można mieć wiele planów jednocześnie', async ({ page }) => {
    await createPlanViaUI(page, '2026-08-12', '2026-08-12');
    await waitForEditView(page, 1);
    await page.getByRole('button', { name: '← Plany' }).click();
    await waitForListView(page);

    await createPlanViaUI(page, '2026-09-01', '2026-09-03');
    await waitForEditView(page, 3);
    await page.getByRole('button', { name: '← Plany' }).click();
    await waitForListView(page);

    const cards = page.locator('.grid > div');
    expect(await cards.count()).toBe(2);
  });
});
