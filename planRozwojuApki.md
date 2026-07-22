# NutriMind — plan architektury i UX/UI

Aktualizacja: 2026-07-22

## Aktualny zakres — różnorodność diety i szybkość

Decyzje produktowe:

- domyślny generator pozostaje zbilansowany i korzysta ze wszystkich
  zweryfikowanych pul, w tym low-carb i dawnej diety testosteronowej;
- profil śródziemnomorski, lokalność i budżetowość są lekką preferencją, a nie
  filtrem wykluczającym pozostałe przepisy;
- masło klarowane jest dozwolonym tłuszczem do smażenia obok oleju rzepakowego;
  oliwa pozostaje opcją smakową i do użycia na zimno;
- nazwa źródła „dieta testosteronowa” nie jest obietnicą wpływu zdrowotnego;
- aplikacja nie dobiera restrykcyjnego profilu medycznego bez aktualnych badań
  i decyzji użytkownika.

Zakres wdrożenia:

1. Uszczelnić seed: aliasy źródeł, prawidłowe wykrywanie OCR i aktualizacja
   kategorii składników bez tworzenia duplikatów.
2. Dodać osiem własnych, polskich przepisów pilotażowych oraz kontrolę ich
   kompletności i zgodności kalorii z makrami.
3. Dodać małą premię punktową dla tagów `profil:srodziemnomorski`, `lokalne` i
   `budzetowe`, bez karania low-carb i pozostałych źródeł.
4. Uruchomić funkcje Vercel we Frankfurcie (`fra1`) i włączyć krótki cache sesji
   Better Auth; bez zmiany hostingu, bazy ani dodawania cache infrastrukturalnego.
5. Zweryfikować dane lekkim runnerem, następnie `check:core` i produkcyjnym buildem.

Świadomie pominięte: selektor medycznych profili, nowa ontologia diet, zewnętrzne
API żywieniowe i hurtowy import cudzych baz. Wrócić do nich dopiero po badaniach
lub gdy osiem nowych receptur nie zapewni wystarczającej różnorodności.

### Wdrożone — 2026-07-22

- Produkcyjny Neon ma 281 przepisów: dodano po dwa nowe śniadania, drugie
  śniadania, obiady i kolacje; zachowano 25 receptur testosteronowych i 22 low-carb.
- Makra nowych receptur przeliczono od gramatur składników na podstawie
  standardowych wartości FoodData Central i typowych polskich etykiet; marki
  produktów mogą powodować niewielkie różnice.
- Seed ma tryb `--dry-run`, kanoniczne aliasy źródeł, poprawne prefiksy OCR,
  kontrolę duplikatów oraz aktualizację kategorii składników.
- Generator lekko premiuje lokalne, budżetowe przepisy śródziemnomorskie, ale
  nie filtruje ani nie karze pozostałych diet.
- Dodano region Vercel `fra1` i 60-sekundowy cache sesji Better Auth.
- Przed zmianą Neon zapisano pełny, ignorowany przez Git backup tabel receptur;
  po zmianie potwierdzono 8/8 nowych makr, 7 komponentów i brak źle
  sklasyfikowanych nazw zawierających olej, oliwę lub masło.

## Cel

NutriMind ma przede wszystkim odpowiadać na trzy codzienne pytania:

1. Co dziś jemy i co trzeba przygotować?
2. Co trzeba kupić?
3. Czy dzisiejsze dane zdrowotne zostały zapisane?

Obecna aplikacja ma już wystarczający fundament. Nie potrzebuje nowego frameworka,
mikroserwisów, globalnego store ani wymiany warstwy UI. Następny etap powinien
uporządkować semantykę bieżącego tygodnia, niezawodność zapisów i hierarchię
informacji.

## Wdrożone — 2026-07-14

- Wspólna data aplikacyjna w strefie `Europe/Warsaw`, blokada nieaktualnego planu
  i jego zakupów oraz mobilny widok domyślnie ograniczony do „Dziś”.
- Atomowe generowanie planu w transakcji Prisma.
- Walidacja wejścia i uczciwy komunikat błędu dla zapisu dziennika zdrowia.
- Trwałe odhaczanie zakupów per plan, dostępny checkbox oraz uproszczone ekrany
  przepisów i ustawień.
- Usunięte nieużywane alternatywne klienty planu i zakupów; dodany `npm run check:core`.

## Najbliższe priorytety

1. **P0: środowisko i zależności** — uzupełnić lokalny Better Auth oraz
   zaktualizować Next.js do wydania bez podatności `postcss` zgłoszonej przez
   `npm audit`; po aktualizacji uruchomić build i ręcznie sprawdzić logowanie.
2. **P1: bezpieczne błędy API** — `apiError` nie powinien zwracać klientowi
   surowych komunikatów z Prisma. Zachować kody 401/403 i jawne błędy walidacji,
   a pozostałe logować po stronie serwera oraz zwracać ogólny komunikat.
3. **P1: testy domeny** — rozszerzyć prosty runner o awarię transakcji generatora,
   walidację zdrowia i zaokrąglanie opakowań zakupów.
4. **P2: dokumentacja** — zaktualizować `README.md` i `CLAUDE.md`, które nadal
   zawierają historyczne odniesienia do SQLite i poprzedniego stosu.

## Stan potwierdzony

- Next.js 16 App Router, TypeScript, Prisma 5, PostgreSQL/Neon, Better Auth.
- Izolacja danych per gospodarstwo jest w modelu i zapytaniach, nie tylko w UI.
- Główne domeny są czytelne: plan, przepisy, zakupy, zdrowie i ustawienia.
- Produkcja działa i jest responsywna; desktopowa siatka planu jest użyteczna.
- `npm run build` przechodzi. Lokalny `.env` nie ma jednak
  `BETTER_AUTH_SECRET` i `BETTER_AUTH_URL`, więc build emituje błędy/ostrzeżenia
  Better Auth, mimo kodu wyjścia 0.
- Produkcja 2026-07-14 nadal pokazuje jako aktywny plan z 15–21 czerwca, a lista
  zakupów jest z niego wyliczana bez ostrzeżenia.
- Brakuje uruchamialnych testów najważniejszej logiki generatora i zakupów.

## Decyzja architektoniczna

Zostaje obecny monolit Next.js:

`strona / route handler -> auth context -> serwis lub Prisma -> PostgreSQL`

Zmiany mają być punktowe:

- wspólna, jawna semantyka daty i bieżącego tygodnia;
- transakcja dla generowania planu;
- małe, czyste funkcje dla logiki wymagającej testów;
- komponenty serwerowe do odczytu, stan klienta tylko dla interakcji;
- żadnej warstwy repository, React Query ani nowego design systemu bez
  zmierzonej potrzeby.

## Etap 0 — higiena i powtarzalny start (częściowo wykonany)

Zakres:

- Uzupełnić lokalny `.env` na podstawie `.env.example` o Better Auth. Nie
  commitować wartości.
- Usunięto nieużywane `components/plan/PlanPageClient.tsx` i
  `app/shopping/ShoppingPageClient.tsx`; aktualne strony używają serwerowych
  `PlanPageContent` i `ShoppingPageContent`.
- Uaktualnić `README.md` i `CLAUDE.md`: usunąć stary opis SQLite, Supabase Auth,
  Anthropic SDK, shadcn i funkcji, które nie odpowiadają bieżącemu repo.

Warunek zakończenia:

- lokalne `npm run dev` i `npm run build` nie emitują błędów Better Auth;
- dokumentacja opisuje Neon/PostgreSQL, Better Auth i rzeczywiste komendy.

## Etap 1 — poprawność przed redesignem (wykonany, poza rozszerzeniem testów)

### 1. Bieżący tydzień

- Dodano jedną małą funkcję daty aplikacyjnej dla strefy `Europe/Warsaw` i użyto
  jej w planie oraz zdrowiu.
- Odróżnić `active` od `current`: plan jest bieżący tylko wtedy, gdy jego zakres
  zawiera dzisiejszą datę.
- Nie archiwizować starego planu podczas zwykłego odczytu.
- Gdy plan jest nieaktualny, pokazać wyraźny komunikat i CTA „Wygeneruj plan na
  ten tydzień”. Stary plan może pozostać niżej jako podgląd.
- Lista zakupów nie udaje aktualnej, jeśli bazuje na wygasłym planie.

Pliki startowe:

- `lib/services/MealPlanGenerator.ts`
- `app/page.tsx`
- `app/shopping/page.tsx`
- `app/health/page.tsx`

### 2. Atomowe generowanie planu

- Zostawić pobranie kandydatów przed zapisem.
- Archiwizację starego planu, utworzenie nowego planu, posiłków i porcji wykonano
  w jednej interaktywnej transakcji Prisma.
- Dopiero po udanej transakcji pobrać pełny plan.

To zapobiega stanowi: stary plan zarchiwizowany, a nowy aktywny plan pusty lub
częściowy po błędzie w połowie operacji.

### 3. Pewny zapis zdrowia

- `HealthClient` sprawdza `res.ok`; komunikat „Zapisano” pojawia się tylko po sukcesie.
- Po błędzie zachować dane w formularzu i pokazać „Nie zapisano — spróbuj
  ponownie”.
- Walidować po stronie API prawdziwą datę kalendarzową i zakresy liczb
  (woda, sen, skale 1–5, punkty 1–3).

### 4. Minimalne testy ryzykownej logiki

- Dodać jeden lekki runner testów TypeScript i tylko testy chroniące:
  bieżący tydzień/strefę czasową, atomowy kontrakt generatora, zakresy zdrowia
  oraz zaokrąglanie opakowań listy zakupów.
- Nie budować rozbudowanej piramidy testów ani fixture frameworka.

Warunek zakończenia:

- wygasły plan i jego zakupy są jawnie oznaczone;
- błąd w dowolnym zapisie generatora nie zmienia aktywnego planu;
- API nie przyjmuje wartości spoza zakresu;
- błędna odpowiedź zapisu zdrowia nigdy nie pokazuje „Zapisano”.

## Etap 2 — codzienny UX (wykonany w minimalnym zakresie)

### Ekran główny

- Zachować `/` i obecną nawigację. Nie dodawać szóstej pozycji „Dashboard”.
- Dodać dwa widoki na tych samych danych: `Dziś` i `Tydzień`.
- Na telefonie domyślnie otwierać `Dziś`; na desktopie zachować obecną siatkę
  tygodnia jako domyślną.
- Widok `Dziś` pokazuje tylko dzisiejsze posiłki, kalorie/makra per profil i
  informację, które potrawy zaczynają dziś nowy batch.
- Uzupełnić etykietę diagnostyczną: zamiast samego „dni w celu” pokazać np.
  „7/7 dni w celu”.

Nie tworzyć osobnej bazy ani API dashboardu — potrzebne dane są już w planie.

### Lista zakupów

- Panel resztek domyślnie zwinąć. Na telefonie obecnie zasłania kilka pierwszych
  ekranów właściwej listy.
- Poprawić tekst „32 produkty/produktów” na prawidłową odmianę.
- Zapisywać zaznaczenia w `localStorage` pod kluczem planu, żeby odświeżenie
  strony nie zerowało zakupów.
- Zastąpić klikalny `div` natywnym checkboxem/etykietą, aby lista działała z
  klawiatury i czytnika ekranu.

`localStorage` jest celowym limitem pierwszej wersji. Synchronizację zakupów
między kontami dodać dopiero, gdy będzie faktycznie potrzebna.

### Przepisy

- Na telefonie przenieść „Dodaj przepis” do nagłówka, żeby przycisk nie nachodził
  na przewijaną listę filtrów.
- Zachować obecną wyszukiwarkę i filtry; poprawić tylko sticky/scroll i hierarchię.
- Nie dodawać kolejnego systemu tagów ani nowej biblioteki komponentów.

### Ustawienia

- Profile, tryb planowania i wygląd zostawić na wierzchu.
- Całe „Domyślne grupowanie” umieścić w natywnym, domyślnie zamkniętym
  `<details>` jako ustawienie zaawansowane.

Warunek zakończenia:

- na telefonie użytkownik widzi dzisiejszy plan bez przewijania siedmiu dni;
- właściwa lista zakupów jest widoczna od razu;
- odświeżenie strony nie usuwa zaznaczeń zakupów;
- najczęstsze ustawienia nie są przykryte długim konfiguratorem batchy.

## Etap 3 — małe porządki w kodzie

- Z `components/recipes/AddRecipeModal.tsx` wydzielić wyłącznie czysty parser
  tekstu przepisu i jego walidację. Komponent ma 740 linii i miesza heurystyki
  importu z obsługą modala.
- Zostawić `PlanView` jako koordynator interakcji. Dzielić go dopiero, gdy kolejna
  funkcja faktycznie zwiększy sprzężenie.
- W generatorze pobrać kandydatów jednym zapytaniem i pogrupować w pamięci, jeśli
  pomiar pokaże, że pięć równoległych zapytań do Neon jest istotnym kosztem.
- W `app/recipes/page.tsx` zastąpić pobieranie wszystkich `variantKey` małym
  zapytaniem `count`, ale tylko w ramach pracy nad wydajnością tej strony.

Warunek zakończenia:

- parser importu ma testy bez renderowania Reacta;
- nie ma nieużywanych alternatywnych ścieżek ładowania stron;
- liczba nowych abstrakcji jest ograniczona do funkcji używanych w co najmniej
  jednym realnym przepływie i teście.

## Etap 4 — wydajność po pomiarze

- Zmierzyć osobno czas: auth context, summary planu, pełny plan, przepisy i listę
  zakupów na produkcji.
- Zachować obecny streaming/Suspense, dopóki pomiar nie wykaże regresji.
- Optymalizować liczbę i kształt zapytań Prisma, nie dodawać cache ani klienta do
  fetchowania „na wszelki wypadek”.
- Po każdej zmianie porównać pierwszy render desktop/mobile i czas przejścia
  między trasami.

## Kolejność wdrożenia

1. Higiena lokalnego środowiska i dokumentacji.
2. Bieżący tydzień + blokada nieaktualnej listy zakupów.
3. Transakcja generatora + test awarii.
4. Zapis i walidacja zdrowia.
5. Widok `Dziś` + poprawki mobilnej listy zakupów.
6. Przepisy i ustawienia — wyłącznie poprawa hierarchii.
7. Ekstrakcja parsera i optymalizacje potwierdzone pomiarem.

## Poza zakresem teraz

- mikroserwisy, osobny backend i repository layer;
- React Query/Zustand/Redux;
- migracja UI do shadcn lub innego design systemu;
- AI chat i AI generator przed uporządkowaniem podstawowego przepływu;
- natywna aplikacja mobilna;
- migracja stringów/JSON do nowych enumów i typów bazy bez konkretnego błędu,
  który miałaby rozwiązać.
