import Decimal from 'decimal.js';
import type {
  Ingredient,
  IngredientCategory,
  Recipe,
  ShoppingListByCategory,
  ShoppingListItem,
} from './types.js';
import { formatQuantity } from '../format.js';

/**
 * Agreguje składniki ze wskazanych przepisów i zwraca listę zakupów
 * pogrupowaną po kategorii. Ten sam składnik z wielu przepisów jest sumowany.
 *
 * Czysta funkcja — nie czyta plików, nie korzysta z DOM.
 *
 * @param recipeIds - id przepisów z aktualnego planu (mogą się powtarzać)
 * @param recipes   - pełna lista przepisów (np. z Content Collection)
 * @param ingredients - pełna lista składników (z getIngredients())
 */
export function buildShoppingList(
  recipeIds: string[],
  recipes: Recipe[],
  ingredients: Ingredient[]
): ShoppingListByCategory {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

  // 1. Zsumuj ilości per ingredientId przez Decimal
  const totals = new Map<string, Decimal>();

  for (const recipeId of recipeIds) {
    const recipe = recipeMap.get(recipeId);
    if (!recipe) continue;

    for (const item of recipe.ingredients) {
      const current = totals.get(item.ingredientId) ?? new Decimal(0);
      totals.set(item.ingredientId, current.plus(new Decimal(item.quantity)));
    }
  }

  // 2. Zbuduj listę pogrupowaną po kategorii
  const result: ShoppingListByCategory = new Map();

  for (const [ingredientId, qty] of totals) {
    const ingredient = ingredientMap.get(ingredientId);
    if (!ingredient) continue;

    const item: ShoppingListItem = {
      ingredientId,
      displayName: ingredient.displayName,
      quantity: formatQuantity(qty, ingredient.formatting.decimalPlaces, ingredient.unit.symbol),
      unitSymbol: ingredient.unit.symbol,
      category: ingredient.category,
    };

    const existing = result.get(ingredient.category) ?? [];
    existing.push(item);
    result.set(ingredient.category, existing);
  }

  // 3. Posortuj składniki alfabetycznie w każdej kategorii
  for (const [cat, items] of result) {
    result.set(
      cat,
      items.sort((a, b) => a.displayName.localeCompare(b.displayName, 'pl'))
    );
  }

  return result;
}

/** Kolejność kategorii w UI listy zakupów (trasa przez sklep). */
export const CATEGORY_ORDER: IngredientCategory[] = [
  'warzywa',
  'owoce',
  'mięso',
  'nabiał',
  'zboża',
  'konserwy',
  'oleje',
  'przyprawy',
];
