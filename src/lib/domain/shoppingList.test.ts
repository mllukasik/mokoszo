import { describe, it, expect } from 'vitest';
import { buildShoppingList } from './shoppingList.js';
import type { Ingredient, Recipe } from './types.js';

// ── Fixture data ──────────────────────────────────────────────────────────────

const cebula: Ingredient = {
  id: 'cebula',
  displayName: 'Cebula',
  unit: { name: 'sztuka', symbol: 'szt' },
  formatting: { decimalPlaces: 0 },
  category: 'warzywa',
  nutritionPerUnit: { calories: 40, protein: 1.1, fat: 0.1, carbs: 9.3 },
};

const makaron: Ingredient = {
  id: 'makaron-spaghetti',
  displayName: 'Makaron spaghetti',
  unit: { name: 'gram', symbol: 'g' },
  formatting: { decimalPlaces: 0 },
  category: 'zboża',
  nutritionPerUnit: { calories: 3.71, protein: 0.13, fat: 0.015, carbs: 0.74 },
};

const oliwa: Ingredient = {
  id: 'oliwa-z-oliwek',
  displayName: 'Oliwa z oliwek',
  unit: { name: 'mililitr', symbol: 'ml' },
  formatting: { decimalPlaces: 0 },
  category: 'oleje',
  nutritionPerUnit: { calories: 8.84, protein: 0, fat: 1.0, carbs: 0 },
};

const ingredients = [cebula, makaron, oliwa];

const bolognese: Recipe = {
  id: 'spaghetti-bolognese',
  title: 'Spaghetti Bolognese',
  servings: 2,
  prepTimeMinutes: 40,
  tags: ['obiad'],
  ingredients: [
    { ingredientId: 'cebula', quantity: '1' },
    { ingredientId: 'makaron-spaghetti', quantity: '200' },
    { ingredientId: 'oliwa-z-oliwek', quantity: '30' },
  ],
};

const zupaZCebula: Recipe = {
  id: 'zupa',
  title: 'Zupa',
  servings: 4,
  prepTimeMinutes: 30,
  tags: ['obiad', 'zupa'],
  ingredients: [
    { ingredientId: 'cebula', quantity: '2' },
    { ingredientId: 'oliwa-z-oliwek', quantity: '20' },
  ],
};

const recipes = [bolognese, zupaZCebula];

// ── Testy ─────────────────────────────────────────────────────────────────────

describe('buildShoppingList', () => {
  it('zwraca pustą mapę dla pustego planu', () => {
    const result = buildShoppingList([], recipes, ingredients);
    expect(result.size).toBe(0);
  });

  it('zwraca listę dla 1 przepisu', () => {
    const result = buildShoppingList(['spaghetti-bolognese'], recipes, ingredients);

    // 3 kategorie: warzywa, zboża, oleje
    expect(result.has('warzywa')).toBe(true);
    expect(result.has('zboża')).toBe(true);
    expect(result.has('oleje')).toBe(true);

    const warzywa = result.get('warzywa')!;
    expect(warzywa).toHaveLength(1);
    expect(warzywa[0].displayName).toBe('Cebula');
    expect(warzywa[0].quantity).toBe('1 szt');
  });

  it('sumuje ten sam składnik z 2 przepisów — brak błędów zaokrągleń', () => {
    // cebula: 1 (bolognese) + 2 (zupa) = 3 szt
    // oliwa: 30 (bolognese) + 20 (zupa) = 50 ml
    const result = buildShoppingList(
      ['spaghetti-bolognese', 'zupa'],
      recipes,
      ingredients
    );

    const warzywa = result.get('warzywa')!;
    const cebulaPoz = warzywa.find((i) => i.ingredientId === 'cebula');
    expect(cebulaPoz?.quantity).toBe('3 szt');

    const oleje = result.get('oleje')!;
    const oliwaPoz = oleje.find((i) => i.ingredientId === 'oliwa-z-oliwek');
    expect(oliwaPoz?.quantity).toBe('50 ml');
  });

  it('poprawnie sumuje dziesiętne bez błędu zmiennoprzecinkowego', () => {
    // 0.1 + 0.1 + 0.1 w JavaScript float = 0.30000000000000004
    // przez Decimal powinno wyjść dokładnie 0.3
    const drobnySkładnik: Ingredient = {
      id: 'drobny',
      displayName: 'Drobny',
      unit: { name: 'gram', symbol: 'g' },
      formatting: { decimalPlaces: 1 },
      category: 'przyprawy',
      nutritionPerUnit: { calories: 0, protein: 0, fat: 0, carbs: 0 },
    };

    const r1: Recipe = {
      id: 'r1', title: 'R1', servings: 1, prepTimeMinutes: 1, tags: ['t'],
      ingredients: [{ ingredientId: 'drobny', quantity: '0.1' }],
    };
    const r2: Recipe = {
      id: 'r2', title: 'R2', servings: 1, prepTimeMinutes: 1, tags: ['t'],
      ingredients: [{ ingredientId: 'drobny', quantity: '0.1' }],
    };
    const r3: Recipe = {
      id: 'r3', title: 'R3', servings: 1, prepTimeMinutes: 1, tags: ['t'],
      ingredients: [{ ingredientId: 'drobny', quantity: '0.1' }],
    };

    const result = buildShoppingList(
      ['r1', 'r2', 'r3'],
      [r1, r2, r3],
      [drobnySkładnik]
    );

    const items = result.get('przyprawy')!;
    expect(items[0].quantity).toBe('0.3 g'); // nie '0.30000000000000004 g'
  });

  it('ignoruje nieznane recipeId bez rzucania błędu', () => {
    expect(() =>
      buildShoppingList(['nieistniejacy-przepis'], recipes, ingredients)
    ).not.toThrow();
  });
});
