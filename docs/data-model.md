# Model danych

## Ingredient (`src/data/ingredients.yaml`)

Jedna centralna baza składników, każdy z **na stałe przypisaną jednostką** — bez konwersji między jednostkami.

```yaml
- id: cebula
  displayName: Cebula
  unit:
    name: sztuka
    symbol: szt
  formatting:
    decimalPlaces: 0
  category: warzywa
  nutritionPerUnit:
    calories: 40
    protein: 1.1
    fat: 0.1
    carbs: 9.3
```

- `nutritionPerUnit` — wartości odżywcze na **1 jednostkę** tego składnika (na 1 szt, na 1 g, na 1 ml, na 1 szczypta).
- `category` — do grupowania listy zakupów. Dopuszczalne wartości: `warzywa`, `owoce`, `nabiał`, `mięso`, `zboża`, `przyprawy`, `oleje`, `konserwy`.
- `formatting.decimalPlaces` — precyzja wyświetlania zagregowanej ilości. Dla wszystkich aktualnych składników wynosi `0` (całe sztuki, całe gramy, całe ml).

### Jednostki używane w projekcie

| Symbol | Nazwa     | Przykładowe składniki                                    |
|--------|-----------|----------------------------------------------------------|
| `szt`  | sztuka    | jajka, banan, cebula, czosnek, papryka, ogórek, marchewka, por |
| `g`    | gram      | mąka, makaron, ryż, płatki owsiane, mięso, kurczak, masło, miód, cukier, twaróg, feta, oliwki, ziemniaki, seler, pomidory |
| `ml`   | mililitr  | mleko, śmietana, oliwa z oliwek                         |
| `szczypta` | szczypta | sól, pieprz, cynamon, oregano                       |

### Przykłady ilustrujące rozpiętość przypadków

```yaml
# Składnik liczony w sztukach
- id: jajko
  displayName: Jajko
  unit:
    name: sztuka
    symbol: szt
  formatting:
    decimalPlaces: 0
  category: nabiał
  nutritionPerUnit:
    calories: 72
    protein: 6.3
    fat: 4.8
    carbs: 0.4

# Składnik ważony w gramach (olej, słodzik, mąka itp.)
- id: maka-pszenna
  displayName: Mąka pszenna
  unit:
    name: gram
    symbol: g
  formatting:
    decimalPlaces: 0
  category: zboża
  nutritionPerUnit:
    calories: 3.6
    protein: 0.1
    fat: 0.01
    carbs: 0.76

# Składnik mierzony w mililitrach
- id: oliwa-z-oliwek
  displayName: Oliwa z oliwek
  unit:
    name: mililitr
    symbol: ml
  formatting:
    decimalPlaces: 0
  category: oleje
  nutritionPerUnit:
    calories: 8.8
    protein: 0
    fat: 1.0
    carbs: 0

# Przyprawa "do smaku" — modelowana jako stała ilość (szczypta)
# Agregacja działa: 3 przepisy × 1 szczypta = 3 szczypty na liście zakupów
# nutritionPerUnit dla szczypty (~0.5g soli) — pomijalnie mała wartość odżywcza
- id: sol
  displayName: Sól
  unit:
    name: szczypta
    symbol: szczypta
  formatting:
    decimalPlaces: 0
  category: przyprawy
  nutritionPerUnit:
    calories: 0
    protein: 0
    fat: 0
    carbs: 0
```

## Recipe (Astro Content Collection: `src/content/recipes/*.md`)

Każdy przepis to plik Markdown z frontmatterem (dane) + treścią (kroki przygotowania).

```yaml
---
id: "spaghetti-bolognese"
title: "Spaghetti Bolognese"
servings: 2
tags: ["obiad", "makaron"]
prepTimeMinutes: 40
ingredients:
  - ingredientId: "cebula"
    quantity: "1"
  - ingredientId: "czosnek"
    quantity: "2"
  - ingredientId: "makaron-spaghetti"
    quantity: "200"
  - ingredientId: "mieso-mielone-wolowe"
    quantity: "300"
  - ingredientId: "pomidory-z-puszki"
    quantity: "400"
  - ingredientId: "oliwa-z-oliwek"
    quantity: "30"
  - ingredientId: "sol"
    quantity: "1"
  - ingredientId: "pieprz"
    quantity: "1"
---

## Krok 1
Podsmaż cebulę i czosnek na oliwie...
```

- `quantity` jako **string** (nie float!) — parsowany do `Decimal` przy obliczeniach.
- `servings` — stała liczba porcji, **bez skalowania w v1**.
- Makra przepisu = suma po wszystkich składnikach: `quantity * nutritionPerUnit` (liczone dynamicznie).

### Tagi używane w projekcie

`śniadanie`, `obiad`, `kolacja`, `deser`, `zupa`, `makaron`, `sałatka`, `wegetariańskie`

## MealPlan (stan w `localStorage`)

```ts
interface MealPlanDay {
  date: string;           // ISO date "2026-08-12"
  recipeIds: string[];    // przepisy przypisane do tego dnia (może być kilka)
}

interface MealPlan {
  version: 1;             // do przyszłych migracji struktury
  days: MealPlanDay[];
}
```

## Content Collection schema (Astro)

`src/content/config.ts` waliduje frontmatter przez Zod:
- `id`, `title` jako wymagane stringi
- `servings` jako liczba całkowita > 0
- `prepTimeMinutes` jako liczba całkowita > 0
- `tags` jako niepusta tablica stringów
- `ingredients` jako niepusta tablica `{ ingredientId: string, quantity: string }`
- Walidacja że `ingredientId` istnieje w `ingredients.yaml` — w osobnym skrypcie build-time (nie w Zod)

## Wczytywanie `ingredients.yaml` w Astro

`ingredients.yaml` wczytywany przez `js-yaml` w module `src/lib/domain/getIngredients.ts`.
To jedyne miejsce czytające plik bezpośrednio — `macros.ts`, `shoppingList.ts` i komponenty korzystają z tej funkcji.
