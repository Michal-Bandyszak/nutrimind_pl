# NutriMind — Plan rozwoju aplikacji

## Stan obecny (Faza 1 MVP — KOMPLETNA ✓)

### Co jest zrobione:
- ✅ Baza danych SQLite + Prisma, 58 przepisów, 473 składników
- ✅ Generator planów z konfiguracją batch cooking (2 dni gotowania/tydzień)
- ✅ Widok tygodniowy z drag & drop, swap, replace przepisów
- ✅ Lista zakupów z kategoriami, opakowaniami, waste warnings
- ✅ Przeglądarka przepisów z CRUD (dodaj, edytuj, usuń)
- ✅ PWA (manifest, service worker, ikony)
- ✅ Strona zdrowia (rutyny poranne/wieczorne, woda, sen, energia, nastrój, punkty 1% Strategy)
- ✅ Ustawienia (osoby, kalorie, domyślny batch config)
- ✅ Responsywny UI (desktop sidebar + mobile bottom bar)
- ✅ Skalowanie porcji dla 2 osób
- ✅ Kolorowe oznaczenie grup batch cooking (6 kolorów)

---

## Propozycje nowych funkcji do wdrożenia

### 🟢 Szybkie wygrane (1-2h każda)

| # | Funkcja | Opis |
|---|---------|------|
| 1 | **Historia planów** | Przeglądanie archiwalnych planów tygodniowych, przywracanie starych planów |
| 2 | **Eksport listy zakupów** | Kopiowanie do schowka / udostępnianie jako tekst (np. do Messengera) |
| 3 | **Statystyki przepisów** | Ile razy użyty w planach, średnie makro, popularność |
| 4 | **Dark mode** | Przełącznik w ustawieniach, zapisywany w localStorage |
| 5 | **Ulubione przepisy** | Gwiazdka na przepisie, filtrowanie po ulubionych |

### 🟡 Średni nakład (3-6h)

| # | Funkcja | Opis |
|---|---------|------|
| 6 | **Dashboard dzienny** | Strona główna: co dziś jesz, makra dnia, postęp rutyny, woda, punkty — wszystko w jednym |
| 7 | **Widok per osoba** | Porcje i makra oddzielnie dla Michała (2500 kcal) i Natalii (1800 kcal) |
| 8 | **Tracker wagi** | Wykres wagi w czasie (Recharts), trend, BMI, cel wagowy |
| 9 | **Historia zdrowia** | Wykres ostatnich 7/30 dni: energia, nastrój, sen, punkty — trendy i progres |
| 10 | **Substytucje składników** | Kliknij składnik → sugerowane zamienniki z bazy diet (np. łosoś ↔ dorsz, olej ↔ oliwa) |
| 11 | **Powiadomienia PWA** | Przypomnienia o rutynie porannej i wieczornej (Push API) |

### 🔴 Większy nakład (1-2 dni)

| # | Funkcja | Opis |
|---|---------|------|
| 12 | **AI generowanie planów** | Claude API do tworzenia zoptymalizowanych planów z uwzględnieniem Mediterranean Score |
| 13 | **AI chat** | Asystent dietetyczny z kontekstem aktualnego planu, zdrowia i celów |
| 14 | **Import nowych diet** | Drag & drop PDF/markdown → automatyczny parsing → nowe przepisy w bazie |
| 15 | **Planowanie naprzód** | Generuj plany na 2-4 tygodnie, z widokiem kalendarza |

### 💡 Nowe pomysły (poza oryginalnym planem)

| # | Funkcja | Opis |
|---|---------|------|
| 16 | **Meal prep timer** | Countdown timer na dzień gotowania z sekwencją kroków (co gotować równolegle) |
| 17 | **Sezonowość składników** | Flaga "w sezonie" na składnikach → tańsze + świeższe, sugestie sezonowych przepisów |
| 18 | **Budżet zakupowy** | Estymacja kosztów planu tygodniowego na podstawie cen składników |
| 19 | **Sharing z partnerem** | QR code / link do współdzielonego widoku listy zakupów (bez logowania) |
| 20 | **Integracja z kalendarzem** | Eksport planu posiłków do Google Calendar / Apple Calendar (.ics) |
| 21 | **Tracker nawodnienia** | Zaawansowany tracker z celem dziennym, powiadomieniami co 1.5h, historią |
| 22 | **Notatki do posiłków** | Dodaj notatkę pod przepisem w planie (np. "więcej czosnku", "zamiast ryżu kasza") |
| 23 | **Porównanie tygodni** | Porównanie makr i punktów zdrowia między tygodniami — progres w czasie |
| 24 | **Quick meal rating** | Oceń posiłek 1-5 po zjedzeniu → lepsze przyszłe plany (baza preferencji) |

---

## Rekomendowana kolejność wdrażania

### Priorytet 1 — Najwięcej wartości, szybkie do zrobienia:
1. **Dashboard dzienny** (#6) — łączy plan + zdrowie + rutyny w jednym widoku
2. **Widok per osoba** (#7) — wykorzystanie istniejących ustawień personAKcal/personBKcal
3. **Eksport listy zakupów** (#2) — szybka wygrana, duża użyteczność w sklepie
4. **Ulubione przepisy** (#5) — łatwe do dodania, poprawia UX

### Priorytet 2 — Rozbudowa trackingu:
5. **Historia zdrowia + wykresy** (#9) — trendy w Recharts, motywacja do trzymania rutyny
6. **Tracker wagi** (#8) — wykres postępów, cel wagowy
7. **Quick meal rating** (#24) — feedback loop dla lepszych planów

### Priorytet 3 — AI & Intelligence:
8. **Substytucje składników** (#10) — najpierw z bazy, potem AI fallback
9. **AI generowanie planów** (#12) — Claude API, Mediterranean Score optimization
10. **AI chat** (#13) — asystent z kontekstem

### Priorytet 4 — Polish & Extras:
11. **Dark mode** (#4)
12. **Powiadomienia PWA** (#11)
13. **Import nowych diet** (#14)
14. **Meal prep timer** (#16)

---

## Fazy wg CLAUDE.md — co jeszcze brakuje:

### Faza 2 (Intelligence) — częściowo zrobiona:
- [ ] Generowanie planów przez Claude API
- [ ] System substytucji składników (IngredientSubstitute model)
- [ ] AI chat z kontekstem
- [ ] Dashboard z wykresami (Recharts)
- [ ] Widok makr per osoba z różnymi celami kcal
- [x] Health log (zrobiony!)
- [ ] Migracja do Supabase PostgreSQL (opcjonalnie, na przyszłość)

### Faza 3 (Coaching):
- [ ] Tracker dopaminowy 30 dni
- [ ] AI coaching spersonalizowany
- [ ] Eksport PDF
- [ ] Udostępnianie planu

### Faza 4 (Polish):
- [ ] USDA FoodData Central integracja
- [ ] Skaner kodów kreskowych
- [ ] Optymalizator meal prep (timeline Gantt)
- [ ] Lighthouse score > 90
- [ ] Onboarding tour

---

*Ostatnia aktualizacja: 2026-02-25*
