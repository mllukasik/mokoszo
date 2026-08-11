# Model danych

> **Status: założenia robocze (draft).** Poniższe pola i przykłady to punkt wyjścia, nie ostateczna struktura.
> Finalizacja modelu jest osobnym taskiem — patrz `docs/tasks.md`, task **T1.0 Analiza potrzeb i finalizacja modelu danych**.
> Ten task ma za zadanie przejrzeć realne przepisy/składniki i dopiero na tej podstawie zamknąć strukturę poniżej.
>
> TODO (do rozstrzygnięcia w T1.0):
> - [ ] Więcej przykładów `Ingredient` niż tylko "cebula" — pokazujące różne jednostki, kategorie, przypadki graniczne (np. przyprawy "do smaku", składniki bez sensownej wartości odżywczej)
> - [ ] Pełna, realna lista wartości `category` (na bazie faktycznych 10 przepisów, nie z góry wymyślona)
> - [ ] Czy są składniki, których nie da się sensownie opisać jedną stałą jednostką (np. "sól do smaku") — i jak je wtedy modelować
> - [ ] Więcej przykładowych przepisów w sekcji `Recipe` (różne długości list składników, różne tagi)

## Ingredient (`src/data/ingredients.yaml`)

Jedna centralna baza składników, każdy z **na stałe przypisaną jednostką** — bez konwersji między jednostkami.

Jeden format danych w całym projekcie — YAML (tak samo jak frontmatter przepisów), zamiast mieszać JSON i YAML.

```yaml
- id: cebula
  displayName: Cebula
  unit:
    name: sztuka
    symbol: szt
  formatting:
    decimalPlaces: 1
  category: warzywa
  nutritionPerUnit:
    calories: 40
    protein: 1.1
    fat: 0.1
    carbs: 9.3
```

- `nutritionPerUnit` — wartości odżywcze na **1 jednostkę** tego składnika (np. na 1 szt albo na 1 g — zależnie jaką jednostkę ma dany składnik).
- `category` — do grupowania listy zakupów (warzywa, nabiał, mięso, przyprawy itd.).
- `formatting.decimalPlaces` — do czego zaokrąglać przy wyświetlaniu (cebule do 1 miejsca, sól np. do 0).

## Recipe (Astro Content Collection: `src/content/recipes/*.md`)

Każdy przepis to plik Markdown z frontmatterem (dane) + treścią (kroki przygotowania).

```yaml
---
id: "spaghetti-bolognese"
title: "Spaghetti Bolognese"
servings: 2
tags: ["obiad", "wloska"]
prepTimeMinutes: 40
ingredients:
  - ingredientId: "cebula"
    quantity: "1"
  - ingredientId: "makaron-spaghetti"
    quantity: "200"
  - ingredientId: "mieso-mielone-wolowe"
    quantity: "300"
---

## Krok 1
Podsmaż cebulę na maśle...

## Krok 2
...
```

- `quantity` jako **string** (nie float!) — parsowany do `Decimal` przy obliczeniach, żeby uniknąć błędów zmiennoprzecinkowych przy sumowaniu w liście zakupów.
- `servings` — stała liczba porcji, **bez skalowania w v1**.
- Makra przepisu = suma po wszystkich składnikach: `quantity * nutritionPerUnit` (liczone dynamicznie, nie trzymane w danych — żeby nie rozjeżdżało się przy edycji składnika).

## MealPlan (stan w `localStorage`)

```ts
interface MealPlanDay {
  date: string;           // ISO date "2026-08-12"
  recipeIds: string[];    // przepisy przypisane do tego dnia (może być kilka - śniadanie/obiad/kolacja)
}

interface MealPlan {
  version: 1;             // do przyszłych migracji struktury
  days: MealPlanDay[];
}
```

## Content Collection schema (Astro)

`src/content/config.ts` powinien walidować frontmatter przez Zod — m.in.:
- `id`, `title` jako wymagane stringi
- `servings` jako liczba całkowita > 0
- `ingredients` jako niepusta tablica `{ ingredientId: string, quantity: string }`
- `ingredientId` w przepisie musi odpowiadać istniejącemu `id` w `ingredients.yaml` (walidacja np. w teście/skrypcie build-time, nie w samym schemacie Zod)

## Wczytywanie `ingredients.yaml` w Astro

`ingredients.yaml` nie jest częścią Content Collections (to nie kolekcja dokumentów, tylko jedna płaska lista/baza) — wczytuj go bezpośrednio przez parser YAML (np. `js-yaml`) w module `src/lib/domain/`, np. `getIngredients.ts`, i re-eksportuj jako typowaną tablicę `Ingredient[]`. Reszta kodu (macros, shoppingList) korzysta z tego jednego miejsca, nie czyta pliku samodzielnie.
