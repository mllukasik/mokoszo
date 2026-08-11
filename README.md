# Mokoszo — Planer Jadłospisu

Statyczna aplikacja webowa do planowania jadłospisu na N dni na bazie własnych przepisów.
Wybierasz przepisy na kolejne dni → dostajesz zagregowaną listę zakupów i podsumowanie makroskładników.

🔗 **Demo:** [portfolio.mllukasik.pl/mokoszo/](https://portfolio.mllukasik.pl/mokoszo/)

---

## Flow

1. **`/`** — przeglądaj przepisy, filtruj po tagach (śniadanie, obiad, kolacja…)
2. **`/przepis/[slug]`** — szczegóły przepisu: składniki, kroki, makra
3. **`/plan`** — utwórz plan na dowolny zakres dat, wybierz przepisy na każdy posiłek
4. **`/lista-zakupow`** — zagregowana lista zakupów i podsumowanie makr całego planu

## Stack

| Technologia | Zastosowanie |
|-------------|--------------|
| [Astro](https://astro.build) | Generator stron statycznych, Content Collections (przepisy) |
| [Tailwind CSS](https://tailwindcss.com) | Stylowanie, mobile-first |
| [Alpine.js](https://alpinejs.dev) | Interaktywność po stronie klienta (planer, filtry, stan) |
| [decimal.js](https://mikemcl.github.io/decimal.js/) | Precyzyjna arytmetyka przy agregacji składników |
| GitHub Pages | Hosting (bez backendu, stan w `localStorage`) |

## Uruchomienie lokalne

```bash
npm install
npm run dev        # dev server: http://localhost:4321/mokoszo/
npm run build      # produkcyjny build do dist/
npm run typecheck  # astro check (TypeScript)
npm test           # testy jednostkowe (vitest)
npm run test:e2e   # testy E2E (Playwright / Chromium)
```

## Struktura projektu

```
src/
├── content/recipes/     # przepisy (.md z frontmatterem YAML)
├── data/ingredients.yaml # centralna baza składników z makrami
├── lib/
│   ├── domain/          # czyste funkcje TS: typy, makra, lista zakupów
│   └── storage/         # abstrakcja localStorage (gotowa pod przyszłe API)
├── components/          # komponenty Astro (RecipeCard, ShoppingList, …)
├── pages/               # strony: index, /przepis/[slug], /plan, /lista-zakupow
└── layouts/Base.astro
```

## Dane — dodawanie przepisów

1. Dodaj brakujące składniki do `src/data/ingredients.yaml`
2. Utwórz `src/content/recipes/nazwa-przepisu.md` z frontmatterem (patrz istniejące pliki)
3. Build zwaliduje spójność `ingredientId` między przepisami a bazą składników

## CI/CD

Push do `main` → GitHub Actions buduje stronę, uruchamia testy (typecheck + vitest + Playwright) i deployuje na GitHub Pages.
