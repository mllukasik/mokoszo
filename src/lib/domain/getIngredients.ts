import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import type { Ingredient } from './types.js';

let cache: Ingredient[] | null = null;

/**
 * Wczytuje i parsuje src/data/ingredients.yaml.
 * Jedyne miejsce w kodzie czytające ten plik — reszta kodu (macros, shoppingList, komponenty)
 * korzysta z tej funkcji.
 *
 * Wynik jest cache'owany w pamięci procesu (build-time, nie runtime przeglądarki).
 */
export function getIngredients(): Ingredient[] {
  if (cache) return cache;

  const filePath = join(process.cwd(), 'src/data/ingredients.yaml');

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`[getIngredients] Nie można wczytać ingredients.yaml: ${filePath}\n${err}`);
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(`[getIngredients] Błąd parsowania YAML w ingredients.yaml:\n${err}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('[getIngredients] ingredients.yaml musi być tablicą YAML');
  }

  cache = parsed as Ingredient[];
  return cache;
}

/** Zwraca jeden składnik po id lub undefined jeśli nie istnieje. */
export function getIngredientById(id: string): Ingredient | undefined {
  return getIngredients().find((i) => i.id === id);
}
