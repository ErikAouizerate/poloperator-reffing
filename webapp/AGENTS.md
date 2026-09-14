# AGENTS.md — webapp

Stack: React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux (classic)

## Commands
- `pnpm dev` — dev server on **port 3003** (`strictPort`).
- `pnpm run build` — `tsc -b && vite build` (typecheck is part of build).
- `pnpm run lint` — **oxlint**, not ESLint (config `.oxlintrc.json`).
- `pnpm test` — `vitest run`, **node** env. Only `src/**/*.test.ts` runs (`vitest.config.ts` include) — pure-logic tests; **no jsdom / `.tsx` component tests configured**. Single file: `pnpm exec vitest run src/services/prediction/prediction.test.ts`.

## Conventions
- Redux is classic: `combineReducers` + RTK `configureStore` with thunks disabled. No `createSlice`.
- Async flows follow `*_REQUESTED` → `*_START` / `*_SUCCESS` / `*_ERROR` through `src/store/apiMiddleware.ts`; side effects are registered in the `apiEffects` map in `src/store/effects.ts` (keyed by action base name). New async flow = action constants (`src/store/tournamentActions.ts`) + an `apiEffects` entry.
- poloperator.com has no CORS headers: fetch via same-origin `/poloperator` path (Vite proxy dev / `nginx.conf` prod, both to `https://poloperator.com`; `VITE_POLOPERATOR_BASE` override) — keep path prefix in sync.
- Keep `pnpm-lock.yaml` in sync (`--frozen-lockfile` in Docker). New deps with build scripts need `pnpm approve-builds`.

## Policies (content copied from Basic Memory, project "main")
- **pnpm only** — never npm or yarn (no `package-lock.json`, no `yarn.lock`). Hardened `pnpm-workspace.yaml`: `minimumReleaseAge: 10080` (7 days) + `minimumReleaseAgeStrict`, `blockExoticSubdeps`, `strictDepBuilds`; approve build scripts explicitly with `pnpm approve-builds` (only `esbuild` is allowed here). Escape hatch `minimumReleaseAgeExclude` used sparingly. (Réf. « pnpm Policy for JS-TS Projects »)
- **TypeScript by default** — write everything in TypeScript; plain JS only where the toolchain requires it (e.g. config files). (Réf. « TypeScript by Default — Avoid Plain JS »)
- **Frontend constraints** — Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no `tailwind.config`); Redux stays classic (`combineReducers`, RTK `configureStore` with thunks disabled, no `createSlice`). (Réf. « Frontend Constraints — Tailwind v4 + Classic Redux »)
