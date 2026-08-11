// ─── Ingredient ────────────────────────────────────────────────────────────────

export interface IngredientUnit {
  name: string;   // np. "sztuka", "gram", "mililitr", "szczypta"
  symbol: string; // np. "szt", "g", "ml", "szczypta"
}

export interface IngredientFormatting {
  decimalPlaces: number;
}

export interface NutritionValues {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export type IngredientCategory =
  | 'warzywa'
  | 'owoce'
  | 'nabiał'
  | 'mięso'
  | 'zboża'
  | 'przyprawy'
  | 'oleje'
  | 'konserwy';

export interface Ingredient {
  id: string;
  displayName: string;
  unit: IngredientUnit;
  formatting: IngredientFormatting;
  category: IngredientCategory;
  nutritionPerUnit: NutritionValues;
}

// ─── Recipe ────────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  ingredientId: string;
  quantity: string; // zawsze string, parsowany przez Decimal przy obliczeniach
}

export interface Recipe {
  id: string;
  title: string;
  servings: number;
  prepTimeMinutes: number;
  tags: string[];
  ingredients: RecipeIngredient[];
}

// ─── MealPlan v1 (legacy — zachowane dla referencji) ──────────────────────────

/** @deprecated Używane tylko przez stare testy. Nowy format: MealPlanV2 */
export interface MealPlanDayV1 {
  date: string;
  recipeIds: string[];
}

/** @deprecated Stary format localStorage. Nowy: MealPlanV2 */
export interface MealPlanV1 {
  version: 1;
  days: MealPlanDayV1[];
}

// ─── MealPlan v2 ───────────────────────────────────────────────────────────────

/** Pojedynczy posiłek w ramach dnia (np. śniadanie, obiad, kolacja lub własny). */
export interface MealSlot {
  id: string;          // unikalny identyfikator slotu (np. "a3b2c1")
  name: string;        // "śniadanie" | "obiad" | "kolacja" | nazwa własna
  recipeId: string | null;
  isCustom: boolean;   // true = użytkownik dodał własny posiłek
}

export interface MealPlanDay {
  date: string;        // ISO date, np. "2026-08-12"
  slots: MealSlot[];   // posiłki na ten dzień
}

export interface MealPlan {
  id: string;          // unikalny identyfikator planu
  days: MealPlanDay[];
  createdAt: string;   // ISO datetime
}

/** Format przechowywany w localStorage pod kluczem 'mokoszo:plans:v2'. */
export interface PlansStorage {
  version: 2;
  plans: MealPlan[];
  activeForShopping: string | null; // id planu wybranego do listy zakupów
}

// ─── Shopping list ─────────────────────────────────────────────────────────────

export interface ShoppingListItem {
  ingredientId: string;
  displayName: string;
  quantity: string;      // sformatowana ilość (po Decimal + formatting)
  unitSymbol: string;
  category: IngredientCategory;
}

export type ShoppingListByCategory = Map<IngredientCategory, ShoppingListItem[]>;
