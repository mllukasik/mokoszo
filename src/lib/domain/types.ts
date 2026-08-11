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

// ─── MealPlan ──────────────────────────────────────────────────────────────────

export interface MealPlanDay {
  date: string;        // ISO date, np. "2026-08-12"
  recipeIds: string[]; // przepisy na ten dzień
}

export interface MealPlan {
  version: 1;
  days: MealPlanDay[];
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
