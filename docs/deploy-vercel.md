# Deploy NutriMind na Vercel + Neon Postgres

Ten dokument opisuje bezpieczny deploy NutriMind z naciskiem na security first:

- aplikacja działa na Vercel,
- baza danych działa na Neon Postgres,
- Prisma obsługuje migracje i seed,
- sekrety nie trafiają do Git,
- `.env` zostaje wyłącznie lokalny i nie jest pushowany.

## Zasady bezpieczeństwa

1. Nigdy nie commituj:
   - `.env`
   - `.env.local`
   - tokenów Vercel
   - connection stringów do Neon
   - dumpów bazy
2. Prawdziwe sekrety ustawiaj tylko:
   - lokalnie w nieśledzonym `.env`
   - w panelu Vercel
   - w panelu Neon
3. Przed każdym pushem sprawdź:

```bash
git status --short
git diff -- .env .env.local
```

4. Jeśli sekret trafił do śledzonego pliku, zatrzymaj deploy i usuń go przed commitem.
5. Nie wklejaj sekretów do:
   - README
   - docsów
   - opisów commitów
   - screenshotów
   - ticketów

## 1. Utwórz bazę w Neon

1. Wejdź na [Neon Console](https://console.neon.tech).
2. Utwórz projekt, np. `nutrimind`.
3. Wybierz region europejski.
4. Skopiuj dwa connection stringi:
   - pooled URL do runtime aplikacji
   - direct URL do migracji Prisma

W praktyce:

- `DATABASE_URL` powinien wskazywać pooled host, zwykle z `-pooler`
- `DIRECT_URL` powinien wskazywać bezpośredni host bazy
- oba URL-e powinny mieć `sslmode=require`

## 2. Ustaw zmienne środowiskowe

W Vercel ustaw dla `Production`, `Preview` i `Development`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

Znaczenie:

- `DATABASE_URL` jest używany przez aplikację w runtime
- `DIRECT_URL` jest używany przez Prisma do migracji

Lokalny wzór trzymaj w `.env.example`. Prawdziwe wartości wpisuj tylko do lokalnego `.env`.

## 3. Przygotowanie lokalne

Skopiuj wzór:

```bash
cp .env.example .env
```

Wklej prawdziwe URL-e z Neon do lokalnego `.env`, a następnie uruchom:

```bash
npm install
npm run db:deploy
npm run db:seed
npm run build
npm run dev
```

To potwierdza, że:

- migracje działają,
- seed działa,
- build przechodzi,
- aplikacja łączy się z Postgres.

## 4. Checklista przed deployem

Wykonaj dokładnie tę kolejność:

```bash
git checkout main
git pull origin main
git status --short
npm run build
```

Jeśli wdrażasz zmiany w schemacie lub danych:

```bash
npm run db:deploy
npm run db:seed
```

Następnie sprawdź, co naprawdę będzie wypchnięte:

```bash
git log --oneline origin/main..main
```

To jest ważne szczególnie wtedy, gdy lokalny `main` jest kilka commitów przed `origin/main`.

## 5. Deploy na Vercel

Są dwie poprawne ścieżki.

### Opcja A: repo jest już podpięte do Vercel

Wystarczy:

```bash
git push origin main
```

Vercel automatycznie rozpocznie deployment z `main`.

### Opcja B: repo nie jest jeszcze podpięte

1. Wypchnij repo do GitHuba.
2. Wejdź na [Vercel New Project](https://vercel.com/new).
3. Zaimportuj repo `nutrimind`.
4. Wybierz preset `Next.js`.
5. Zostaw build command:

```bash
npm run build
```

6. Ustaw env vars z kroku 2.
7. Kliknij `Deploy`.

## 6. Migracja i seed produkcji

Najbezpieczniej uruchamiać je lokalnie, z produkcyjnymi URL-ami Neon wpisanymi do lokalnego `.env`:

```bash
npm run db:deploy
npm run db:seed
```

Ważne:

- nie używaj `prisma migrate dev` na produkcji
- na produkcji używaj tylko `prisma migrate deploy`
- seed jest idempotentny, więc można go uruchamiać wielokrotnie

Nie podpinaj seeda automatycznie pod każdy deploy Vercela. Deployment nie powinien zmieniać danych przy każdym redeployu.

## 7. Kolejne zmiany schematu

Jeśli zmieniasz `prisma/schema.prisma`, lokalnie wykonaj:

```bash
npm run db:migrate -- --name nazwa_zmiany
npm run db:generate
npm run build
```

Potem:

1. commitujesz nowy folder w `prisma/migrations/`
2. pushujesz zmiany
3. po deployu odpalasz:

```bash
npm run db:deploy
```

## 8. Smoke test po deployu

Po udanym deployu sprawdź ręcznie:

1. czy strona główna się otwiera
2. czy `/recipes` ładuje dane
3. czy generowanie planu działa
4. czy `/api/recipes` nie zwraca błędu 500
5. czy nowe warianty kalorii i komponenty przepisów są widoczne

Jeśli UI wstało, ale dane są niepełne lub dziwne, najpierw uruchom:

```bash
npm run db:seed
```

a dopiero potem debuguj frontend.

## 9. Dane z SQLite

Ta konfiguracja zakłada Postgresa w Neon.

Przepisy i składniki są odtwarzane przez:

```bash
npm run db:seed
```

Jeśli w lokalnym `prisma/dev.db` masz ręcznie dodane:

- przepisy
- plany tygodnia
- ustawienia

to nie przeniosą się automatycznie do Neon. Trzeba je:

- osobno wyeksportować i zaimportować
  albo
- włączyć do danych seedujących

## 10. Minimalna sekwencja bezpiecznego deployu

Jeżeli wszystko jest już podpięte i chcesz tylko wdrożyć nowe zmiany:

```bash
git checkout main
git pull origin main
git status --short
npm run build
npm run db:deploy
npm run db:seed
git log --oneline origin/main..main
git push origin main
```

To jest preferowana ścieżka deployu dla tego repo.
