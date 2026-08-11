# Poza zakresem v1 (przyszłość)

Rozpisanie prac nad samym v1 (taski + kryteria akceptacji) jest w `docs/tasks.md`.
Ta lista to funkcjonalności świadomie odłożone na później — nie zaczynaj ich, dopóki v1 nie jest gotowe.

- Skalowanie porcji przepisu (np. przepis na 2 osoby → user chce na 4)
- Backend / synchronizacja między urządzeniami (interfejs `MealPlanRepository` już to przewiduje)
- Autentykacja / multi-user
- Dodawanie przepisów przez UI (na razie edycja plików `.md` ręcznie / przez Claude Code)
- Zdjęcia przepisów
- Widok do druku listy zakupów
- Export listy zakupów (np. do pliku / na telefon)
- Filtry i numer strony zapisywane w URL (query params)

Uwaga: konwersja jednostek między przepisami **nie dotyczy** tego projektu — jednostka jest stała per składnik (patrz `data-model.md`), więc to nie jest "odłożone na potem", tylko świadomie uproszczony model.
