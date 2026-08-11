import type { MealPlan } from '../domain/types.js';

/**
 * Abstrakcja nad persystencją planu posiłków.
 * v1 implementacja: LocalStorageMealPlanRepository
 * Podmiana na backend/API w przyszłości nie wymaga zmian w komponentach UI.
 */
export interface MealPlanRepository {
  getPlan(): MealPlan | null;
  savePlan(plan: MealPlan): void;
  clearPlan(): void;
}
