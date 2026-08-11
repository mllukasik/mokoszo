import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calculateRecipeMacros, calculatePlanMacros } from './macros.js';
import type { Ingredient, Recipe } from './types.js';

// ── Fixture data ──────────────────────────────────────────────────────────────

const jajko: Ingredient = {
  id: 'jajko',
  displayName: 'Jajko',
  unit: { name: 'sztuka', symbol: 'szt' },
  formatting: { decimalPlaces: 0 },
  category: 'nabiał',
  nutritionPerUnit: { calories: 72, protein: 6.3, fat: 4.8, carbs: 0.4 },
};

const masło: Ingredient = {
  id: 'masło',
  displayName: 'Masło',
  unit: { name: 'gram', symbol: 'g' },
  formatting: { decimalPlaces: 0 },
  category: 'nabiał',
  nutritionPerUnit: { calories: 7.17, protein: 0.009, fat: 0.081, carbs: 0.001 },
};

const sol: Ingredient = {
  id: 'sol',
  displayName: 'Sól',
  unit: { name: 'szczypta', symbol: 'szczypta' },
  formatting: { decimalPlaces: 0 },
  category: 'przyprawy',
  nutritionPerUnit: { calories: 0, protein: 0, fat: 0, carbs: 0 },
};

const ingredients = [jajko, masło, sol];

const przepisJajecznica: Recipe = {
  id: 'jajecznica',
  title: 'Jajecznica',
  servings: 1,
  prepTimeMinutes: 10,
  tags: ['śniadanie'],
  ingredients: [
    { ingredientId: 'jajko', quantity: '3' },
    { ingredientId: 'masło', quantity: '15' },
    { ingredientId: 'sol', quantity: '1' },
  ],
};

// ── calculateRecipeMacros ─────────────────────────────────────────────────────

describe('calculateRecipeMacros', () => {
  it('liczy makra dla przepisu z 1 składnikiem', () => {
    const recipe: Recipe = {
      id: 'test',
      title: 'Test',
      servings: 1,
      prepTimeMinutes: 5,
      tags: ['test'],
      ingredients: [{ ingredientId: 'jajko', quantity: '1' }],
    };
    const result = calculateRecipeMacros(recipe, ingredients);
    expect(result.calories).toBe(72);
    expect(result.protein).toBe(6.3);
    expect(result.fat).toBe(4.8);
    expect(result.carbs).toBe(0.4);
  });

  it('sumuje makra z wielu składników', () => {
    // 3 jajka: 3×72=216 kcal, 3×6.3=18.9g białka, 3×4.8=14.4g tłuszczu, 3×0.4=1.2g węgli
    // 15g masła: 15×7.17=107.55 kcal, 15×0.009=0.135g białka, 15×0.081=1.215g tłuszczu, 15×0.001=0.015g węgli
    // sól: 0
    const result = calculateRecipeMacros(przepisJajecznica, ingredients);
    expect(result.calories).toBe(323.6);  // 216 + 107.55 = 323.55 → 323.6
    expect(result.protein).toBe(19.0);    // 18.9 + 0.135 = 19.035 → 19.0
    expect(result.fat).toBe(15.6);        // 14.4 + 1.215 = 15.615 → 15.6
    expect(result.carbs).toBe(1.2);       // 1.2 + 0.015 = 1.215 → 1.2
  });

  it('zwraca zera dla pustej listy składników', () => {
    const empty: Recipe = {
      id: 'pusty',
      title: 'Pusty',
      servings: 1,
      prepTimeMinutes: 5,
      tags: ['test'],
      ingredients: [],
    };
    const result = calculateRecipeMacros(empty, ingredients);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.carbs).toBe(0);
  });

  it('pomija nieznane ingredientId (nie rzuca błędem)', () => {
    const recipe: Recipe = {
      id: 'test',
      title: 'Test',
      servings: 1,
      prepTimeMinutes: 5,
      tags: ['test'],
      ingredients: [{ ingredientId: 'nieistniejacy', quantity: '5' }],
    };
    expect(() => calculateRecipeMacros(recipe, ingredients)).not.toThrow();
  });
});

// ── calculatePlanMacros ───────────────────────────────────────────────────────

describe('calculatePlanMacros', () => {
  it('zwraca zera dla pustego planu', () => {
    const result = calculatePlanMacros([], ingredients);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
  });

  it('sumuje makra z wielu przepisów', () => {
    const single = calculateRecipeMacros(przepisJajecznica, ingredients);
    const plan = calculatePlanMacros([przepisJajecznica, przepisJajecznica], ingredients);
    expect(plan.calories).toBe(
      new Decimal(single.calories).plus(single.calories).toDecimalPlaces(1).toNumber()
    );
    expect(plan.protein).toBeCloseTo(single.protein * 2, 1);
  });
});
