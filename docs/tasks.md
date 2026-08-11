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
- [ ] Workflow `.github/workflows/deploy.yml` builduje projekt (`npm run build`) i publikuje `dist/` przez `actions/deploy-pages` (lub `actions/upload-pages-artifact` + `actions/deploy-pages`)
- [ ] W ustawieniach repo (Settings → Pages) źródło ustawione na "GitHub Actions"
- [ ] Strona dostępna pod adresem `*.github.io/...` po pushu do gałęzi głównej
- [ ] `site` i `base` w `astro.config.mjs` ustawione poprawnie pod nazwę repo (linki wewnętrzne działają, nie ma 404 na assetach) — jeśli repo nazywa się inaczej niż `<user>.github.io`, `base` musi być `/<nazwa-repo>/`

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
- [ ] Przejrzane wszystkie 10 planowanych przepisów (choćby na szkicu/liście) pod kątem tego, jakie pola faktycznie będą potrzebne — np. czy każdy składnik da się opisać jedną stałą jednostką, czy pojawiają się przypadki graniczne (przyprawy "do smaku", składniki opcjonalne, warianty przepisu)
- [ ] Przejrzane realne kategorie składników, jakie wystąpią (nie zgadywanie z góry) — żeby `category` w `ingredients.yaml` była kompletna i konsekwentna
- [ ] Zweryfikowane założenia z `docs/data-model.md` (patrz TODO w tym pliku) względem realnych danych — jeśli któreś założenie się nie broni, model jest poprawiony **przed** napisaniem `ingredients.yaml` i przepisów, nie po
- [ ] `docs/data-model.md` zaktualizowany do wersji finalnej: usunięty nagłówek "założenia robocze", dopisane realne przykłady (min. 3 różne składniki pokazujące rozpiętość przypadków, nie tylko cebula), rozstrzygnięte wszystkie TODO
- [ ] Schema Zod w T1.1 opiera się już na tej finalnej wersji, nie na wstępnych założeniach

### T1.1 Schema Content Collection dla przepisów
**AC:**
- [ ] `src/content/config.ts` definiuje schemat Zod zgodny z `docs/data-model.md`
- [ ] Build failuje, jeśli przepis ma brakujące/złego typu pole (np. `servings` jako string zamiast liczby)
- [ ] `ingredients` w schemacie wymaga niepustej tablicy `{ ingredientId: string, quantity: string }`

### T1.2 Baza składników (`ingredients.yaml`)
**AC:**
- [ ] Plik zawiera wszystkie składniki potrzebne do 10 startowych przepisów
- [ ] Każdy wpis ma komplet pól: `id`, `displayName`, `unit`, `formatting`, `category`, `nutritionPerUnit`
- [ ] `id` jest unikalny i w kebab-case

### T1.3 Napisanie 10 przepisów
**AC:**
- [ ] 10 plików `.md` w `src/content/recipes/`, każdy z poprawnym frontmatterem i krokami w treści
- [ ] Wszystkie `ingredientId` użyte w przepisach istnieją w `ingredients.yaml`
- [ ] Każdy przepis ma min. 1 tag (pod filtrowanie z Fazy 4)

### T1.4 Walidacja spójności danych (build-time)
**AC:**
- [ ] Skrypt (np. w `astro.config.mjs` integration albo osobny node script uruchamiany w CI) sprawdza, że każdy `ingredientId` w przepisach istnieje w `ingredients.yaml`
- [ ] Build/CI failuje z czytelnym komunikatem, jeśli walidacja nie przejdzie (wskazuje który przepis i który brakujący `ingredientId`)

### T1.5 Loader `getIngredients.ts`
**AC:**
- [ ] Funkcja wczytuje i parsuje `src/data/ingredients.yaml` (przez `js-yaml`) i zwraca typowaną tablicę `Ingredient[]`
- [ ] To jedyne miejsce w kodzie, które bezpośrednio czyta plik `ingredients.yaml` — `macros.ts`, `shoppingList.ts` i komponenty korzystają z tej funkcji, nie z pliku bezpośrednio
- [ ] Błąd parsowania YAML (np. literówka w składni) daje czytelny komunikat przy buildzie

---

## Faza 2 — Logika domenowa (czyste funkcje TS, bez zależności od DOM)

### T2.1 Typy (`src/lib/domain/types.ts`)
**AC:**
- [ ] Typy `Ingredient`, `Recipe`, `MealPlan`, `MealPlanDay` zgodne z `docs/data-model.md`
- [ ] Reużywane zarówno przez logikę domenową, jak i komponenty Astro/Alpine (brak duplikacji typów)

### T2.2 Liczenie makr (`macros.ts`)
**AC:**
- [ ] Funkcja przyjmuje przepis (lub listę przepisów) i zwraca sumę `calories/protein/fat/carbs`
- [ ] Liczenie odbywa się przez `Decimal`, wynik zwracany jako `number` zaokrąglony do rozsądnej precyzji (np. 1 miejsce po przecinku)
- [ ] Testy jednostkowe: pojedynczy przepis, plan wielodniowy, przepis z 1 składnikiem, przepis pusty (edge case)

### T2.3 Agregacja listy zakupów (`shoppingList.ts`)
**AC:**
- [ ] Funkcja przyjmuje listę `recipeIds` (z całego planu) i zwraca listę pogrupowaną po `category`, z zsumowanymi ilościami per `ingredientId`
- [ ] Sumowanie przez `Decimal` — test potwierdzający brak błędów zaokrągleń (np. suma wielu małych wartości dziesiętnych)
- [ ] Ten sam składnik użyty w 2+ przepisach pojawia się na liście **raz**, z sumą ilości
- [ ] Wynik sformatowany zgodnie z `formatting.decimalPlaces` danego składnika
- [ ] Testy jednostkowe: pusty plan, plan z 1 przepisem, plan z powtarzającymi się składnikami między przepisami

### T2.4 Formatowanie liczb (`format.ts`)
**AC:**
- [ ] Funkcja `formatQuantity(value: Decimal, decimalPlaces: number, unitSymbol: string): string` zwraca gotowy string do wyświetlenia (np. `"2.5 szt"`)
- [ ] Obsługuje `decimalPlaces: 0` (bez części dziesiętnej)
- [ ] Testy jednostkowe na kilku przypadkach zaokrągleń

---

## Faza 3 — Storage

### T3.1 Interfejs `MealPlanRepository`
**AC:**
- [ ] Interfejs definiuje `getPlan(): MealPlan | null`, `savePlan(plan: MealPlan): void`, `clearPlan(): void`
- [ ] Żaden komponent UI nie odwołuje się bezpośrednio do `localStorage` — zawsze przez ten interfejs

### T3.2 Implementacja `LocalStorageMealPlanRepository`
**AC:**
- [ ] Zapisuje/odczytuje plan pod ustalonym kluczem w `localStorage`, w formacie zgodnym z `MealPlan` (z polem `version`)
- [ ] Odczyt brakującego/uszkodzonego wpisu nie rzuca wyjątkiem — zwraca `null` (traktowane jako brak planu)
- [ ] Testy jednostkowe (z mockiem `localStorage` lub w jsdom): zapis→odczyt zwraca ten sam plan, `clearPlan` faktycznie czyści dane

---

## Faza 4 — Przeglądanie przepisów

### T4.1 `RecipeCard.astro`
**AC:**
- [ ] Wyświetla tytuł, tagi, czas przygotowania przepisu
- [ ] Link prowadzi do `/przepis/[slug]`
- [ ] Responsywna: pełna szerokość na mobile, ograniczona w gridzie na desktop

### T4.2 `index.astro` — lista przepisów
**AC:**
- [ ] Renderuje wszystkie przepisy z Content Collection jako `RecipeCard`
- [ ] Grid: 1 kolumna mobile, 2-3 kolumny desktop (Tailwind `grid-cols-*` + breakpointy)

### T4.3 `RecipeFilters.astro` — filtrowanie po tagach
**AC:**
- [ ] Lista unikalnych tagów wyliczona ze wszystkich przepisów, renderowana jako klikalne pill/checkbox
- [ ] Wybór tagu(-ów) filtruje widoczne przepisy po stronie klienta (Alpine), bez przeładowania strony
- [ ] Możliwość zaznaczenia wielu tagów naraz (logika: przepis pasuje, jeśli ma **którykolwiek** z zaznaczonych tagów — do potwierdzenia, ale przyjmujemy to jako domyślne)
- [ ] Wyczyszczenie filtrów pokazuje wszystkie przepisy

### T4.4 `RecipeList.astro` — paginacja
**AC:**
- [ ] Lista przepisów dzielona na strony po ustalonej liczbie (np. 6/9 na stronę — do dostrojenia)
- [ ] Paginacja liczona **po przefiltrowanej** liście, nie po całej bazie
- [ ] Zmiana filtra resetuje widok do strony 1
- [ ] Przyciski nawigacji (poprzednia/następna lub numery stron) czytelne i klikalne na mobile (odpowiedni touch target)

### T4.5 `przepis/[slug].astro` — widok szczegółowy
**AC:**
- [ ] Wyświetla pełną listę składników z ilościami (sformatowanymi przez `format.ts`)
- [ ] Wyświetla kroki przygotowania (render Markdown treści)
- [ ] Wyświetla makra przepisu (z `macros.ts`)
- [ ] Działa dla każdego z 10 przepisów bez błędów renderowania

---

## Faza 5 — Planer

### T5.1 `plan.astro` — wybór liczby dni
**AC:**
- [ ] User może ustawić liczbę dni planu (input liczbowy lub podobne)
- [ ] Zmiana liczby dni nie kasuje już przypisanych przepisów dla istniejących dni (chyba że dni są skracane — wtedy nadmiarowe dni i ich przypisania usuwane)

### T5.2 `MealPlanner.astro` — przypisywanie przepisów do dni
**AC:**
- [ ] Dla każdego dnia można wybrać 1+ przepis (z listy 10 dostępnych)
- [ ] Każda zmiana natychmiast zapisywana przez `MealPlanRepository` do `localStorage`
- [ ] Po odświeżeniu strony plan jest odtwarzany z `localStorage` (persist działa)
- [ ] Layout: dni w pionie (scroll) na mobile, siatka/kolumny na desktop

---

## Faza 6 — Lista zakupów i makra

### T6.1 `lista-zakupow.astro`
**AC:**
- [ ] Odczytuje aktualny plan z `MealPlanRepository`
- [ ] Jeśli plan jest pusty — czytelny komunikat (nie pusta biała strona) z linkiem do `/plan`
- [ ] Wywołuje `shoppingList.ts` i renderuje wynik

### T6.2 `ShoppingList.astro`
**AC:**
- [ ] Lista pogrupowana po `category`, każda kategoria zwijana/rozwijana (Alpine `x-show`)
- [ ] Każdy składnik ma checkbox (stan checkboxa może żyć tylko w pamięci sesji — bez wymogu trwałości w v1, do potwierdzenia)
- [ ] Duży, czytelny tekst i touch targety wygodne na telefonie (priorytet: używane w sklepie)

### T6.3 `MacrosSummary.astro`
**AC:**
- [ ] Pokazuje sumę makr (kalorie/białko/tłuszcz/węgle) dla całego planu
- [ ] Liczby czytelne i zaokrąglone (nie 10 miejsc po przecinku)

---

## Faza 7 — Responsywność i polish

### T7.1 Przegląd wszystkich stron pod mobile-first
**AC:**
- [ ] Każda strona przetestowana na ~375px, ~768px, ~1280px (DevTools albo realne urządzenie)
- [ ] Brak poziomego scrolla na żadnej szerokości
- [ ] Elementy klikalne (linki, przyciski, checkboxy) mają wystarczający touch target na mobile (min. ~44px wysokości)

---

## Faza 8 — Finalny deploy

### T8.1 Weryfikacja produkcyjna
**AC:**
- [ ] Pełny flow (przeglądanie → planowanie → lista zakupów) przetestowany na żywym URL GitHub Pages, nie tylko lokalnie
- [ ] Dane w `localStorage` przeżywają przeładowanie strony na produkcji
- [ ] Brak błędów w konsoli przeglądarki na żadnej z 4 głównych stron
