import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageMealPlanRepository } from './LocalStorageMealPlanRepository.js';
import type { MealPlan } from '../domain/types.js';

// ── Mock localStorage ─────────────────────────────────────────────────────────

const store: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
};

// @ts-expect-error — podmiana globalnego localStorage w środowisku node
global.localStorage = localStorageMock;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const samplePlan: MealPlan = {
  version: 1,
  days: [
    { date: '2026-08-11', recipeIds: ['spaghetti-bolognese'] },
    { date: '2026-08-12', recipeIds: ['zupa-pomidorowa', 'salatka-grecka'] },
  ],
};

// ── Testy ─────────────────────────────────────────────────────────────────────

describe('LocalStorageMealPlanRepository', () => {
  let repo: LocalStorageMealPlanRepository;

  beforeEach(() => {
    localStorageMock.clear();
    repo = new LocalStorageMealPlanRepository();
  });

  it('getPlan zwraca null gdy brak danych', () => {
    expect(repo.getPlan()).toBeNull();
  });

  it('savePlan → getPlan zwraca ten sam plan', () => {
    repo.savePlan(samplePlan);
    const result = repo.getPlan();
    expect(result).toEqual(samplePlan);
  });

  it('clearPlan usuwa plan — getPlan zwraca null', () => {
    repo.savePlan(samplePlan);
    repo.clearPlan();
    expect(repo.getPlan()).toBeNull();
  });

  it('getPlan zwraca null przy uszkodzonym JSON', () => {
    store['mokoszo:meal-plan:v1'] = '{nie-to-json}';
    expect(repo.getPlan()).toBeNull();
  });

  it('getPlan zwraca null gdy version !== 1', () => {
    store['mokoszo:meal-plan:v1'] = JSON.stringify({ version: 2, days: [] });
    expect(repo.getPlan()).toBeNull();
  });

  it('getPlan zwraca null gdy brak pola days', () => {
    store['mokoszo:meal-plan:v1'] = JSON.stringify({ version: 1 });
    expect(repo.getPlan()).toBeNull();
  });

  it('savePlan zachowuje plan z wieloma dniami i przepisami', () => {
    const complexPlan: MealPlan = {
      version: 1,
      days: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-08-${String(11 + i).padStart(2, '0')}`,
        recipeIds: ['owsianka-z-bananem', 'spaghetti-bolognese'],
      })),
    };
    repo.savePlan(complexPlan);
    expect(repo.getPlan()).toEqual(complexPlan);
  });
});
