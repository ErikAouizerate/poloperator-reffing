# AGENTS.md — webapp

Stack: React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux (classic)

## Commands
- `pnpm dev` — dev server on **port 3003** (`strictPort`; every config uses 3003, not 3000).
- `pnpm run build` — `tsc -b && vite build` (typecheck is part of build).
- `pnpm run lint` — **oxlint**, not ESLint (config `.oxlintrc.json`).
- `pnpm test` — `vitest run`, **node** env. Only `src/**/*.test.ts` runs (`vitest.config.ts` include) — pure-logic tests; **no jsdom / `.tsx` component tests configured**. Single file: `pnpm exec vitest run src/services/prediction/prediction.test.ts`.

## Conventions
- Redux is classic: `combineReducers` + RTK `configureStore` with thunks disabled. No `createSlice`.
- Async flows follow `*_REQUESTED` → `*_START` / `*_SUCCESS` / `*_ERROR` through `src/store/apiMiddleware.ts`; side effects are registered in the `apiEffects` map in `src/store/effects.ts` (keyed by action base name). New async flow = action constants (`src/store/tournamentActions.ts`) + an `apiEffects` entry.
- poloperator.com has no CORS headers: fetch via same-origin `/poloperator` path (Vite proxy dev / `nginx.conf` prod, both to `https://poloperator.com`; `VITE_POLOPERATOR_BASE` override) — keep path prefix in sync.
- Keep `pnpm-lock.yaml` in sync (`--frozen-lockfile` in Docker). New deps with build scripts need `pnpm approve-builds`.

Policies (Basic Memory, project "main"):
- memory://main/guidelines/pnpm-policy-for-js-ts-projects
- memory://main/guidelines/frontend-constraints-tailwind-v4-classic-redux
- memory://main/guidelines/type-script-by-default-avoid-plain-js
