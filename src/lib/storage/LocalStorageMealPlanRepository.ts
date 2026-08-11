import type { MealPlan } from '../domain/types.js';
import type { MealPlanRepository } from './MealPlanRepository.js';

const STORAGE_KEY = 'mokoszo:meal-plan:v1';

export class LocalStorageMealPlanRepository implements MealPlanRepository {
  getPlan(): MealPlan | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as MealPlan;
      // Prosta walidacja — ochrona przed uszkodzonymi danymi
      if (parsed.version !== 1 || !Array.isArray(parsed.days)) return null;
      return parsed;
    } catch {
      // Uszkodzony JSON lub brak dostępu do localStorage — traktujemy jako brak planu
      return null;
    }
  }

  savePlan(plan: MealPlan): void {
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
