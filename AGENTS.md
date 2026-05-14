# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js App Router project written in TypeScript. Route entry points live in `app/`, with page-specific clients such as `app/recipes/RecipesClient.tsx` and API handlers in `app/api/**/route.ts`. Shared UI is organized by feature under `components/` (`plan/`, `recipes/`, `health/`, `nav/`). Server-side logic, Prisma access, types, and utilities live in `lib/`. Database schema, migrations, and seed data are in `prisma/`. Data import and maintenance scripts belong in `scripts/`, while static assets and PWA files live in `public/`.

## Build, Test, and Development Commands
Use `npm run dev` to start the local app at `http://localhost:3000`. Run `npm run build` to generate the Prisma client and create a production build, then `npm run start` to serve it. Database workflows use Prisma: `npm run db:migrate`, `npm run db:generate`, `npm run db:seed`, `npm run db:reset`, and `npm run db:studio`. Content import tasks use `npm run parse:diets`; icon generation uses `npm run gen:icons`.

## Coding Style & Naming Conventions
Follow the existing TypeScript style: 2-space indentation, semicolons, single quotes, and strict typing. Prefer the `@/*` path alias over deep relative imports. React components and Prisma-backed services use `PascalCase` filenames (`PlanView.tsx`, `MealPlanGenerator.ts`); utility modules use `camelCase` (`planUtils.ts`). Keep feature code grouped by domain, and place small route-specific helpers close to the owning page or API route.

## Testing Guidelines
There is currently no committed Jest, Vitest, or Playwright setup. Until automated tests are added, validate changes by running `npm run build`, exercising the affected screens locally, and checking relevant Prisma flows with `npm run db:seed` or `npm run db:studio`. When adding tests later, colocate them with the feature or in a dedicated `tests/` folder and use clear names like `MealPlanGenerator.test.ts`.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits, for example `feat(recipes): add favorites...` and `fix(ui): improve amount display...`. Keep commits focused and use `feat`, `fix`, or another clear type with an optional scope. Pull requests should describe user-visible changes, note any schema or seed updates, link related issues, and include screenshots for UI changes.

## Security & Configuration Tips
Keep secrets in `.env`; the default local database is SQLite via `DATABASE_URL`. Do not commit generated databases or credentials. If you change `prisma/schema.prisma`, run a migration and regenerate the client before opening a PR.
