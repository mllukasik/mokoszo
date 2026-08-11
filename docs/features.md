# Wymagania UI/UX

## Responsywność

Strona musi działać dobrze zarówno na telefonie (lista zakupów będzie realnie przeglądana w sklepie), jak i na komputerze (planowanie jadłospisu wygodniejsze na większym ekranie).

- **Mobile-first** podejście w Tailwind — bazowe klasy dla mobile, `md:`/`lg:` breakpointy dla większych ekranów
- `/plan` — na mobile lista dni w pionie (scroll), na desktopie może być siatka/kolumny obok siebie
- `/lista-zakupow` — priorytet czytelności na małym ekranie (duży tekst, checkboxy łatwe do kliknięcia palcem, grupowanie po kategoriach zwijane/rozwijane)
- Karty przepisów (`RecipeCard`) — 1 kolumna na mobile, 2-3 kolumny na desktopie (Tailwind grid)
- Testować na realnych szerokościach: ~375px (mobile), ~768px (tablet), ~1280px+ (desktop)

## Filtrowanie i paginacja listy przepisów

Na `/` (lista przepisów) potrzebne:

- **Filtrowanie po tagach** (np. `obiad`, `sniadanie`, `wloska`) — checkboxy/pills nad listą, obsługiwane przez Alpine (`x-data` trzyma aktywne filtry, `x-show`/`x-for` renderuje przefiltrowaną listę) — całość client-side, dane przepisów wciąż statyczne z Content Collections
- **Paginacja** — przy 10 przepisach na start realnie niepotrzebna, ale wymóg na przyszłość (baza przepisów będzie rosła) → zaimplementować od razu prosty mechanizm (np. N przepisów na stronę, przyciski "poprzednia/następna" albo "pokaż więcej"), żeby nie trzeba było przebudowywać UI przy 50+ przepisach
- Filtrowanie i paginacja działają razem (paginacja liczona po przefiltrowanej liście, nie po całej bazie)
- Rozważyć: filtry i numer strony w URL (query params), żeby link do konkretnego widoku dało się wysłać/zapisać — do decyzji przy implementacji, nie blokujące w v1

```
src/components/
  RecipeFilters.astro   # Alpine - wybór tagów
  RecipeList.astro       # Alpine - filtrowanie + paginacja + render kart
```
