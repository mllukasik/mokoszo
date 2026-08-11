# Projekt: Planer Jadłospisu (nazwa robocza)

Statyczna strona do planowania jadłospisu na N dni na bazie własnych przepisów.
User wybiera przepisy na kolejne dni → dostaje listę zakupów + podsumowanie makro.
Deploy: GitHub Pages, bez backendu — cały stan trzymany po stronie klienta.

Nazwa projektu: **Mokoszo**
Repo GitHub: https://github.com/mllukasik/mokoszo (branch: `main`)
GitHub login: `mllukasik`

## GitHub CLI

Do operacji na repo używaj `gh` CLI (jest dostępny i uwierzytelniony):

```bash
# push do main
git push origin main

# tworzenie PR
gh pr create --title "..." --body "..."

# status workflow CI
gh run list --limit 5

# szczegóły workflow
gh run view <run-id>
```

Deploy target: `https://portfolio.mllukasik.pl/mokoszo/`
Custom domain GitHub Pages: `portfolio.mllukasik.pl`
`site: 'https://portfolio.mllukasik.pl'` + `base: '/mokoszo/'` w `astro.config.mjs`

## Stack

- **Astro** — generator strony statycznej (Content Collections do przepisów)
- **Tailwind CSS** — stylowanie, mobile-first
- **Alpine.js** — interaktywność klienta (planer, filtry, stan)
- **decimal.js** — precyzyjna arytmetyka na ilościach składników (nie `number`/`parseFloat`)
- Brak backendu w v1, ale warstwa storage przygotowana pod przyszłą rozbudowę

## Flow usera (skrót)

1. `/` — przegląda przepisy, filtruje po tagach, paginacja
2. `/przepis/[slug]` — szczegóły przepisu, składniki, kroki, makra
3. `/plan` — wybiera liczbę dni + przepisy per dzień → zapis do `localStorage`
4. `/lista-zakupow` — zagregowana lista zakupów + makra z aktualnego planu

## Dokumentacja szczegółowa

Poniższe pliki wczytuj **tylko gdy pracujesz nad danym obszarem** (nie trzeba trzymać ich wszystkich w głowie na raz):

- **Model danych** (Ingredient, Recipe, MealPlan, schematy JSON/frontmatter) → @docs/data-model.md
  Read when: dodajesz/edytujesz przepis, składnik, albo zmieniasz strukturę danych.
  Uwaga: to na razie założenia robocze — finalizacja jest zadaniem T1.0 w `docs/tasks.md`, zanim zaczniesz implementować dane.

- **Architektura i struktura folderów** (storage abstraction, logika domenowa, drzewo katalogów) → @docs/architecture.md
  Read when: tworzysz nowe pliki, dodajesz moduł, zmieniasz organizację kodu.

- **Wymagania UI/UX** (responsywność, filtrowanie, paginacja) → @docs/features.md
  Read when: pracujesz nad komponentami stron (`pages/`, `components/`).

- **Zadania do zrobienia (v1), podzielone na fazy z kryteriami akceptacji** → @docs/tasks.md
  Read when: zaczynasz nową sesję pracy / pytasz "co dalej" / kończysz task i szukasz kolejnego.

- **Co świadomie poza v1** → @docs/future.md
  Read when: rozważasz dodanie nowej funkcjonalności — sprawdź, czy nie jest już zaplanowana na później (nie zaczynaj tych rzeczy przed ukończeniem v1).

## Workflow

- Pracuj task po tasku z `docs/tasks.md`, w kolejności faz (kolejna faza zakłada, że poprzednia jest zrobiona)
- Po ukończeniu tasku odznacz jego checkboxy AC w `docs/tasks.md` (`[ ]` → `[x]`) w tym samym commicie/PR
- Jeśli AC jakiegoś tasku okaże się niejasne lub sprzeczne z tym co widzisz w kodzie — zapytaj, zanim zaczniesz zgadywać

## Konwencje ogólne

- Cały state klienta w Alpine (`x-data`), logika domenowa (macros, shoppingList) jako czyste funkcje TS bez zależności od DOM
- Nowe składniki zawsze w `src/data/ingredients.yaml`, nigdy inline w przepisie
- Jeden format danych w projekcie: **YAML** (baza składników + frontmatter przepisów) — nie mieszamy z JSON
- `quantity` zawsze jako string w JSON/frontmatter, parsowane przez `Decimal` — nigdy bezpośrednio `parseFloat` do sumowania
- Nazwy plików przepisów = `id` w kebab-case, zgodne ze `slug` w Content Collections
