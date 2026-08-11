import type { MealPlanV1 } from '../domain/types.js';
import type { MealPlanRepository } from './MealPlanRepository.js';

// Klucz formatu v1 — aplikacja używa teraz 'mokoszo:plans:v2' inline w plan.astro.
// Ta implementacja zachowana dla referencji i testów jednostkowych.
const STORAGE_KEY = 'mokoszo:meal-plan:v1';

export class LocalStorageMealPlanRepository implements MealPlanRepository {
  getPlan(): MealPlanV1 | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as MealPlanV1;
      // Prosta walidacja — ochrona przed uszkodzonymi danymi
      if (parsed.version !== 1 || !Array.isArray(parsed.days)) return null;
      return parsed;
    } catch {
      // Uszkodzony JSON lub brak dostępu do localStorage — traktujemy jako brak planu
      return null;
    }
  }

  savePlan(plan: MealPlanV1): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      // Np. tryb prywatny z zablokowanym localStorage — ignorujemy cicho
    }
  }

  clearPlan(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // j.w.
    }
  }
}
