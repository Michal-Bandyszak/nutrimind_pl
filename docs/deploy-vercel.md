# Deploy NutriMind na Vercel + Neon Postgres

Ten branch przygotowuje aplikację pod prosty deploy na Vercel:

- aplikacja: Vercel,
- baza danych: Neon Postgres,
- ORM: Prisma,
- migracje produkcyjne: `prisma migrate deploy`.

## 1. Utwórz bazę w Neon

1. Wejdź na https://console.neon.tech.
2. Utwórz nowy projekt, np. `nutrimind`.
3. Wybierz region europejski, najlepiej możliwie blisko użytkowników.
4. Skopiuj dwa connection stringi:
   - pooled connection string do aplikacji,
   - direct connection string do migracji.

W Neon host pooled zwykle zawiera `-pooler`. Direct URL powinien prowadzić do zwykłego hosta bazy. Oba URL-e powinny mieć `sslmode=require`.

## 2. Ustaw zmienne środowiskowe

W Vercel dodaj dla Production, Preview i Development:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

`DATABASE_URL` ma być pooled i będzie używany przez aplikację w runtime. `DIRECT_URL` ma być direct i będzie używany przez Prisma do migracji.

Nie commituj prawdziwych sekretów. Lokalny wzór jest w `.env.example`.

## 3. Przetestuj bazę lokalnie

Skopiuj przykład envów:

```bash
cp .env.example .env
```

Wklej prawdziwe URL-e z Neon do `.env`, a potem uruchom:

```bash
npm install
npm run db:deploy
npm run db:seed
npm run build
npm run dev
```

Po tym aplikacja lokalna będzie działać na tej samej bazie Postgres, którą można podłączyć do Vercel.

## 4. Deploy przez dashboard Vercel

1. Wypchnij branch do GitHuba.
2. Wejdź na https://vercel.com/new.
3. Zaimportuj repo `nutrimind`.
4. Framework preset: `Next.js`.
5. Build command zostaw jako:

```bash
npm run build
```

6. Dodaj env vars z kroku 2.
7. Kliknij `Deploy`.

## 5. Migracja i seed produkcji

Najbezpieczniej uruchamiać migracje z lokalnego terminala, używając produkcyjnych URL-i Neon w `.env`:

```bash
npm run db:deploy
npm run db:seed
```

Nie uruchamiaj `prisma migrate dev` na produkcji. `migrate dev` służy do tworzenia nowych migracji lokalnie, a `migrate deploy` do stosowania gotowych migracji na produkcyjnej bazie.

Seed jest idempotentny: aktualizuje przepisy i składniki, więc można go odpalać ponownie po zmianach w danych. Nie podpinaj seeda automatycznie pod każdy build Vercel, żeby deployment nie modyfikował danych przy każdym redeployu.

## 6. Kolejne zmiany schematu

Gdy zmieniasz `prisma/schema.prisma`:

```bash
npm run db:migrate -- --name nazwa_zmiany
npm run db:generate
npm run build
```

Następnie commitujesz nowy folder w `prisma/migrations/`. Po deployu branch/main:

```bash
npm run db:deploy
```

## Ważna uwaga o danych z SQLite

Ten branch przygotowuje świeżą bazę Postgres pod deploy. Dane bazowe aplikacji, czyli przepisy i składniki, są odtwarzane przez `npm run db:seed`.

Jeżeli w lokalnym `prisma/dev.db` masz ręcznie dodane przepisy, plany tygodnia albo ustawienia, one nie przeniosą się automatycznie. Trzeba je osobno wyeksportować z SQLite i zaimportować do Postgresa albo dodać do danych seedujących.
