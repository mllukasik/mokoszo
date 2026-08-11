import Decimal from 'decimal.js';
import type { Ingredient, NutritionValues, Recipe } from './types.js';

/**
 * Oblicza makra dla pojedynczego przepisu.
 * Czysta funkcja — nie czyta plików, nie korzysta z DOM.
 */
export function calculateRecipeMacros(
  recipe: Recipe,
  ingredients: Ingredient[]
): NutritionValues {
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

  let calories = new Decimal(0);
  let protein = new Decimal(0);
  let fat = new Decimal(0);
  let carbs = new Decimal(0);

  for (const item of recipe.ingredients) {
    const ingredient = ingredientMap.get(item.ingredientId);
    if (!ingredient) continue; // pomijamy nieznane — walidacja build-time to wyłapuje

    const qty = new Decimal(item.quantity);
    const n = ingredient.nutritionPerUnit;

    calories = calories.plus(qty.times(n.calories));
    protein = protein.plus(qty.times(n.protein));
    fat = fat.plus(qty.times(n.fat));
    carbs = carbs.plus(qty.times(n.carbs));
  }

  return {
    calories: calories.toDecimalPlaces(1).toNumber(),
    protein: protein.toDecimalPlaces(1).toNumber(),
    fat: fat.toDecimalPlaces(1).toNumber(),
    carbs: carbs.toDecimalPlaces(1).toNumber(),
  };
}

/**
 * Oblicza makra dla całego planu (lista przepisów).
 * Czysta funkcja — nie czyta plików, nie korzysta z DOM.
 */
export function calculatePlanMacros(
  recipes: Recipe[],
  ingredients: Ingredient[]
): NutritionValues {
  let calories = new Decimal(0);
  let protein = new Decimal(0);
  let fat = new Decimal(0);
  let carbs = new Decimal(0);

  for (const recipe of recipes) {
    const m = calculateRecipeMacros(recipe, ingredients);
    calories = calories.plus(m.calories);
    protein = protein.plus(m.protein);
    fat = fat.plus(m.fat);
    carbs = carbs.plus(m.carbs);
  }

  return {
    calories: calories.toDecimalPlaces(1).toNumber(),
    protein: protein.toDecimalPlaces(1).toNumber(),
    fat: fat.toDecimalPlaces(1).toNumber(),
    carbs: carbs.toDecimalPlaces(1).toNumber(),
  };
}
