# Zadania (v1) — rozpisanie na fazy z kryteriami akceptacji

Kolejność faz odzwierciedla zależności (każda kolejna faza zakłada, że poprzednia jest zrobiona).
Każdy task ma kryteria akceptacji (AC) — task uznajemy za zrobiony, gdy wszystkie AC są spełnione.

---

## Faza 0 — Setup projektu

### T0.1 Inicjalizacja Astro + Tailwind
**AC:**
- [x] `npm create astro@latest` uruchomione, projekt buduje się lokalnie (`npm run dev` działa)
- [x] Tailwind zintegrowany (`npx astro add tailwind`), klasy Tailwind działają w `.astro`
- [x] `astro.config.mjs` skonfigurowany pod deploy na GitHub Pages (poprawny `site`/`base` — patrz T0.2)

### T0.2 Konfiguracja CI/CD na GitHub Pages
**AC:**
- [x] Workflow `.github/workflows/deploy.yml` builduje projekt (`npm run build`) i publikuje `dist/` przez `actions/deploy-pages` (lub `actions/upload-pages-artifact` + `actions/deploy-pages`)
- [x] W ustawieniach repo (Settings → Pages) źródło ustawione na "GitHub Actions"
- [x] Strona dostępna pod adresem `*.github.io/...` po pushu do gałęzi głównej (custom domain: https://portfolio.mllukasik.pl/mokoszo/)
- [x] `site` i `base` w `astro.config.mjs` ustawione poprawnie pod nazwę repo (linki wewnętrzne działają, nie ma 404 na assetach) — jeśli repo nazywa się inaczej niż `<user>.github.io`, `base` musi być `/<nazwa-repo>/`

### T0.3 Instalacja zależności domenowych
**AC:**
- [x] `alpinejs` zainstalowany i zainicjalizowany globalnie w `Base.astro` (dostępny na każdej stronie)
- [x] `decimal.js` zainstalowany
- [x] `js-yaml` (lub równoważny parser YAML) zainstalowany — do wczytywania `ingredients.yaml`
- [x] Prosty smoke test: komponent Alpine z `x-data` renderuje się i reaguje na klik na stronie testowej

---

## Faza 1 — Model danych i zawartość

### T1.0 Analiza potrzeb i finalizacja modelu danych
**AC:**
- [x] Przejrzane wszystkie 10 planowanych przepisów (choćby na szkicu/liście) pod kątem tego, jakie pola faktycznie będą potrzebne — np. czy każdy składnik da się opisać jedną stałą jednostką, czy pojawiają się przypadki graniczne (przyprawy "do smaku", składniki opcjonalne, warianty przepisu)
- [x] Przejrzane realne kategorie składników, jakie wystąpią (nie zgadywanie z góry) — żeby `category` w `ingredients.yaml` była kompletna i konsekwentna
- [x] Zweryfikowane założenia z `docs/data-model.md` (patrz TODO w tym pliku) względem realnych danych — jeśli któreś założenie się nie broni, model jest poprawiony **przed** napisaniem `ingredients.yaml` i przepisów, nie po
- [x] `docs/data-model.md` zaktualizowany do wersji finalnej: usunięty nagłówek "założenia robocze", dopisane realne przykłady (min. 3 różne składniki pokazujące rozpiętość przypadków, nie tylko cebula), rozstrzygnięte wszystkie TODO
- [x] Schema Zod w T1.1 opiera się już na tej finalnej wersji, nie na wstępnych założeniach

### T1.1 Schema Content Collection dla przepisów
**AC:**
- [x] `src/content/config.ts` definiuje schemat Zod zgodny z `docs/data-model.md`
- [x] Build failuje, jeśli przepis ma brakujące/złego typu pole (np. `servings` jako string zamiast liczby)
- [x] `ingredients` w schemacie wymaga niepustej tablicy `{ ingredientId: string, quantity: string }`

### T1.2 Baza składników (`ingredients.yaml`)
**AC:**
- [x] Plik zawiera wszystkie składniki potrzebne do 10 startowych przepisów
- [x] Każdy wpis ma komplet pól: `id`, `displayName`, `unit`, `formatting`, `category`, `nutritionPerUnit`
- [x] `id` jest unikalny i w kebab-case

### T1.3 Napisanie 10 przepisów
**AC:**
- [x] 10 plików `.md` w `src/content/recipes/`, każdy z poprawnym frontmatterem i krokami w treści
- [x] Wszystkie `ingredientId` użyte w przepisach istnieją w `ingredients.yaml`
- [x] Każdy przepis ma min. 1 tag (pod filtrowanie z Fazy 4)

### T1.4 Walidacja spójności danych (build-time)
**AC:**
- [x] Skrypt (np. w `astro.config.mjs` integration albo osobny node script uruchamiany w CI) sprawdza, że każdy `ingredientId` w przepisach istnieje w `ingredients.yaml`
- [x] Build/CI failuje z czytelnym komunikatem, jeśli walidacja nie przejdzie (wskazuje który przepis i który brakujący `ingredientId`)

### T1.5 Loader `getIngredients.ts`
**AC:**
- [x] Funkcja wczytuje i parsuje `src/data/ingredients.yaml` (przez `js-yaml`) i zwraca typowaną tablicę `Ingredient[]`
- [x] To jedyne miejsce w kodzie, które bezpośrednio czyta plik `ingredients.yaml` — `macros.ts`, `shoppingList.ts` i komponenty korzystają z tej funkcji, nie z pliku bezpośrednio
- [x] Błąd parsowania YAML (np. literówka w składni) daje czytelny komunikat przy buildzie

---

## Faza 2 — Logika domenowa (czyste funkcje TS, bez zależności od DOM)

### T2.1 Typy (`src/lib/domain/types.ts`)
**AC:**
- [x] Typy `Ingredient`, `Recipe`, `MealPlan`, `MealPlanDay` zgodne z `docs/data-model.md`
- [x] Reużywane zarówno przez logikę domenową, jak i komponenty Astro/Alpine (brak duplikacji typów)

### T2.2 Liczenie makr (`macros.ts`)
**AC:**
- [x] Funkcja przyjmuje przepis (lub listę przepisów) i zwraca sumę `calories/protein/fat/carbs`
- [x] Liczenie odbywa się przez `Decimal`, wynik zwracany jako `number` zaokrąglony do rozsądnej precyzji (np. 1 miejsce po przecinku)
- [x] Testy jednostkowe: pojedynczy przepis, plan wielodniowy, przepis z 1 składnikiem, przepis pusty (edge case)

### T2.3 Agregacja listy zakupów (`shoppingList.ts`)
**AC:**
- [x] Funkcja przyjmuje listę `recipeIds` (z całego planu) i zwraca listę pogrupowaną po `category`, z zsumowanymi ilościami per `ingredientId`
- [x] Sumowanie przez `Decimal` — test potwierdzający brak błędów zaokrągleń (np. suma wielu małych wartości dziesiętnych)
- [x] Ten sam składnik użyty w 2+ przepisach pojawia się na liście **raz**, z sumą ilości
- [x] Wynik sformatowany zgodnie z `formatting.decimalPlaces` danego składnika
- [x] Testy jednostkowe: pusty plan, plan z 1 przepisem, plan z powtarzającymi się składnikami między przepisami

### T2.4 Formatowanie liczb (`format.ts`)
**AC:**
- [x] Funkcja `formatQuantity(value: Decimal, decimalPlaces: number, unitSymbol: string): string` zwraca gotowy string do wyświetlenia (np. `"2.5 szt"`)
- [x] Obsługuje `decimalPlaces: 0` (bez części dziesiętnej)
- [x] Testy jednostkowe na kilku przypadkach zaokrągleń

---

## Faza 3 — Storage

### T3.1 Interfejs `MealPlanRepository`
**AC:**
- [x] Interfejs definiuje `getPlan(): MealPlan | null`, `savePlan(plan: MealPlan): void`, `clearPlan(): void`
- [x] Żaden komponent UI nie odwołuje się bezpośrednio do `localStorage` — zawsze przez ten interfejs

### T3.2 Implementacja `LocalStorageMealPlanRepository`
**AC:**
- [x] Zapisuje/odczytuje plan pod ustalonym kluczem w `localStorage`, w formacie zgodnym z `MealPlan` (z polem `version`)
- [x] Odczyt brakującego/uszkodzonego wpisu nie rzuca wyjątkiem — zwraca `null` (traktowane jako brak planu)
- [x] Testy jednostkowe (z mockiem `localStorage` lub w jsdom): zapis→odczyt zwraca ten sam plan, `clearPlan` faktycznie czyści dane

---

## Faza 4 — Przeglądanie przepisów

### T4.1 `RecipeCard.astro`
**AC:**
- [x] Wyświetla tytuł, tagi, czas przygotowania przepisu
- [x] Link prowadzi do `/przepis/[slug]`
- [x] Responsywna: pełna szerokość na mobile, ograniczona w gridzie na desktop

### T4.2 `index.astro` — lista przepisów
**AC:**
- [x] Renderuje wszystkie przepisy z Content Collection jako `RecipeCard`
- [x] Grid: 1 kolumna mobile, 2-3 kolumny desktop (Tailwind `grid-cols-*` + breakpointy)

### T4.3 `RecipeFilters.astro` — filtrowanie po tagach
**AC:**
- [x] Lista unikalnych tagów wyliczona ze wszystkich przepisów, renderowana jako klikalne pill/checkbox
- [x] Wybór tagu(-ów) filtruje widoczne przepisy po stronie klienta (Alpine), bez przeładowania strony
- [x] Możliwość zaznaczenia wielu tagów naraz (logika: przepis pasuje, jeśli ma **którykolwiek** z zaznaczonych tagów — do potwierdzenia, ale przyjmujemy to jako domyślne)
- [x] Wyczyszczenie filtrów pokazuje wszystkie przepisy

### T4.4 `RecipeList.astro` — paginacja
**AC:**
- [x] Lista przepisów dzielona na strony po ustalonej liczbie (np. 6/9 na stronę — do dostrojenia)
- [x] Paginacja liczona **po przefiltrowanej** liście, nie po całej bazie
- [x] Zmiana filtra resetuje widok do strony 1
- [x] Przyciski nawigacji (poprzednia/następna lub numery stron) czytelne i klikalne na mobile (odpowiedni touch target)

### T4.5 `przepis/[slug].astro` — widok szczegółowy
**AC:**
- [x] Wyświetla pełną listę składników z ilościami (sformatowanymi przez `format.ts`)
- [x] Wyświetla kroki przygotowania (render Markdown treści)
- [x] Wyświetla makra przepisu (z `macros.ts`)
- [x] Działa dla każdego z 10 przepisów bez błędów renderowania

---

## Faza 5 — Planer

### T5.1 `plan.astro` — wybór liczby dni
**AC:**
- [x] User może ustawić liczbę dni planu (input liczbowy lub podobne)
- [x] Zmiana liczby dni nie kasuje już przypisanych przepisów dla istniejących dni (chyba że dni są skracane — wtedy nadmiarowe dni i ich przypisania usuwane)

### T5.2 `MealPlanner.astro` — przypisywanie przepisów do dni
**AC:**
- [x] Dla każdego dnia można wybrać 1+ przepis (z listy 10 dostępnych)
- [x] Każda zmiana natychmiast zapisywana przez `MealPlanRepository` do `localStorage`
- [x] Po odświeżeniu strony plan jest odtwarzany z `localStorage` (persist działa)
- [x] Layout: dni w pionie (scroll) na mobile, siatka/kolumny na desktop

---

## Faza 6 — Lista zakupów i makra

### T6.1 `lista-zakupow.astro`
**AC:**
- [x] Odczytuje aktualny plan z `MealPlanRepository`
- [x] Jeśli plan jest pusty — czytelny komunikat (nie pusta biała strona) z linkiem do `/plan`
- [x] Wywołuje `shoppingList.ts` i renderuje wynik

### T6.2 `ShoppingList.astro`
**AC:**
- [x] Lista pogrupowana po `category`, każda kategoria zwijana/rozwijana (Alpine `x-show`)
- [x] Każdy składnik ma checkbox (stan checkboxa może żyć tylko w pamięci sesji — bez wymogu trwałości w v1, do potwierdzenia)
- [x] Duży, czytelny tekst i touch targety wygodne na telefonie (priorytet: używane w sklepie)

### T6.3 `MacrosSummary.astro`
**AC:**
- [x] Pokazuje sumę makr (kalorie/białko/tłuszcz/węgle) dla całego planu
- [x] Liczby czytelne i zaokrąglone (nie 10 miejsc po przecinku)

---

## Faza 7 — Responsywność i polish

### T7.1 Przegląd wszystkich stron pod mobile-first
**AC:**
- [x] Każda strona przetestowana na ~375px, ~768px, ~1280px (DevTools albo realne urządzenie)
- [x] Brak poziomego scrolla na żadnej szerokości
- [x] Elementy klikalne (linki, przyciski, checkboxy) mają wystarczający touch target na mobile (min. ~44px wysokości)

---

## Faza 8 — Finalny deploy

### T8.1 Weryfikacja produkcyjna
**AC:**
- [x] Pełny flow (przeglądanie → planowanie → lista zakupów) przetestowany na żywym URL GitHub Pages, nie tylko lokalnie
- [x] Dane w `localStorage` przeżywają przeładowanie strony na produkcji
- [x] Brak błędów w konsoli przeglądarki na żadnej z 4 głównych stron
