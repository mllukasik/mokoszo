import type { MealPlanV1 } from '../domain/types.js';

/**
 * Abstrakcja nad persystencją planu posiłków (legacy v1 — jeden plan).
 * Nowy format v2 (wiele planów, sloty posiłków) jest obsługiwany inline
 * w plan.astro i lista-zakupow.astro z kluczem 'mokoszo:plans:v2'.
 * Interfejs zachowany pod podmianę na backend/API w przyszłości.
 */
export interface MealPlanRepository {
  getPlan(): MealPlanV1 | null;
  savePlan(plan: MealPlanV1): void;
  clearPlan(): void;
}
