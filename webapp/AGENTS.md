# AGENTS.md — webapp

Stack: React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux (classic)

## Commands
- `pnpm dev` — dev server on **port 3003** (README's "localhost:3000" is stale).
- `pnpm run build` — `tsc -b && vite build` (typecheck is part of build).
- `pnpm run lint` — **oxlint**, not ESLint (config `.oxlintrc.json`).
- No tests configured.

## Conventions
- Redux is classic: `combineReducers` + RTK `configureStore` with thunks disabled. No `createSlice`.
- Async flows go through `src/store/apiMiddleware.ts` as `*_REQUESTED` → `*_START` / `*_SUCCESS` / `*_ERROR`. The middleware is currently a stub resolving with the payload.
- Keep `pnpm-lock.yaml` in sync (`--frozen-lockfile` in Docker). New deps with build scripts need `pnpm approve-builds`.

Policies (Basic Memory, project "main"):
- memory://main/guidelines/pnpm-policy-for-js-ts-projects
- memory://main/guidelines/frontend-constraints-tailwind-v4-classic-redux
- memory://main/guidelines/type-script-by-default-avoid-plain-js
