# Architektura i struktura projektu

## Warstwa storage (przygotowana pod przyszłą rozbudowę)

Interfejs abstrakcyjny, żeby móc w przyszłości podmienić `localStorage` na np. backend/API bez przepisywania logiki UI.

```
src/lib/storage/
  MealPlanRepository.ts               // interfejs: getPlan(), savePlan(plan), clearPlan()
  LocalStorageMealPlanRepository.ts   // implementacja v1
```

W v1 UI korzysta wyłącznie z `LocalStorageMealPlanRepository`, ale zawsze przez interfejs `MealPlanRepository` — podmiana implementacji w przyszłości nie wymaga zmian w komponentach.

## Logika domenowa

```
src/lib/domain/
  types.ts             // Ingredient, Recipe, MealPlan, itd.
  macros.ts            // liczenie makr dla przepisu i dla całego planu
  shoppingList.ts       // agregacja składników z wybranych przepisów -> lista zakupów
```

**shoppingList.ts** — algorytm:
1. Zbierz wszystkie `recipeIds` z wybranych dni planu
2. Dla każdego przepisu rozwiń listę składników (`ingredientId` + `quantity`)
3. Grupuj po `ingredientId`, sumuj `quantity` przez `Decimal` (nie `number`)
4. Dociągnij dane składnika (`displayName`, `unit`, `category`, `formatting`) z `ingredients.yaml` (przez `getIngredients.ts`)
5. Sformatuj wynik wg `formatting.decimalPlaces`
6. Zwróć pogrupowane po `category` (do wygodnego wyświetlenia w UI: "Warzywa: Cebula 3 szt, ...")

**macros.ts** — sumuje `quantity * nutritionPerUnit` dla każdego składnika w przepisie / w całym planie.

## Struktura projektu

```
/
├── astro.config.mjs
├── tailwind.config.mjs
├── CLAUDE.md
├── docs/
│   ├── data-model.md
│   ├── architecture.md
│   ├── features.md
│   └── roadmap.md
├── src/
│   ├── content/
│   │   ├── config.ts              # Astro content collection schema (zod) dla recipes
│   │   └── recipes/
│   │       ├── spaghetti-bolognese.md
│   │       └── ... (10 przepisów)
│   ├── data/
│   │   └── ingredients.yaml
│   ├── lib/
│   │   ├── storage/
│   │   │   ├── MealPlanRepository.ts
│   │   │   └── LocalStorageMealPlanRepository.ts
│   │   ├── domain/
│   │   │   ├── types.ts
│   │   │   ├── getIngredients.ts
│   │   │   ├── macros.ts
│   │   │   └── shoppingList.ts
│   │   └── format.ts              # NumberFormatter helper (Intl.NumberFormat wrapper)
│   ├── components/
│   │   ├── RecipeCard.astro
│   │   ├── RecipeFilters.astro     # Alpine - wybór tagów
│   │   ├── RecipeList.astro        # Alpine - filtrowanie + paginacja + render kart
│   │   ├── MealPlanner.astro       # Alpine - wybór przepisów per dzień
│   │   ├── ShoppingList.astro
│   │   └── MacrosSummary.astro
│   ├── layouts/
│   │   └── Base.astro
│   └── pages/
│       ├── index.astro             # lista wszystkich przepisów
│       ├── przepis/[slug].astro    # widok pojedynczego przepisu
│       ├── plan.astro              # planer: wybór N dni + przepisów, zapis do localStorage
│       └── lista-zakupow.astro     # wygenerowana lista zakupów + makra z aktualnego planu
└── public/
```
