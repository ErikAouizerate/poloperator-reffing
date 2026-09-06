# AGENTS.md — poloperator-reffing

Communication with the user is in French; all code, documentation, and tests are in English.

## Layout
- `webapp/` — the only app: React 19 + Vite + TypeScript + Tailwind CSS v4 + classic Redux. No backend implemented yet.
- `docs/superpowers/specs/` + `plans/` — dated superpowers specs/plans. Domain authority is `docs/superpowers/specs/2026-09-01-poloperator-reffing-design.md` (referee-slotting rules, RSC data source/shape). A NestJS + Postgres backend exists only as a draft spec there (`2026-09-01-nestjs-backend-design.md`) — not built.

## Data source (why the proxy exists)
- No API: the app scrapes poloperator.com (Next.js App Router) **RSC flight payloads** — requests need the `rsc: 1` header, RSC dates are prefixed `$D`, ~15 forfeit matches (null `teamBId`) are parsed but excluded from slotting. Details in the design spec above.
- poloperator.com sends **no CORS headers**, so fetches go through a same-origin proxy: Vite `server.proxy` (dev, `vite.config.ts`) and nginx `location /poloperator/` (prod, `webapp/nginx.conf`), both targeting `https://poloperator.com` (`services/poloperator/fetch.ts`, override target with `VITE_POLOPERATOR_BASE`). Keep the `/poloperator` path prefix and rewrite in sync across both proxies and `fetch.ts`.

## Commands (run inside `webapp/`)
- `pnpm install` — keep `pnpm-lock.yaml` in sync (CI/Docker install with `--frozen-lockfile`).
- `pnpm dev` — Vite dev server, **port 3003** (`strictPort`). The root README's docker blurb says port 3000, but every config (override, Dockerfile, nginx, devcontainer) uses 3003.
- `pnpm test` — `vitest run`, **node** env, only `src/**/*.test.ts` is picked up (pure-logic tests: prediction engine, RSC parser, replay validation, reducers, url/countdown utils). **No jsdom / component (`.tsx`) tests configured** — a `.tsx` test would silently never run. Single file: `pnpm exec vitest run src/services/prediction/prediction.test.ts`.
- `pnpm run build` — `tsc -b && vite build`: **typecheck is part of build**.
- `pnpm run lint` — **oxlint** (not ESLint); config `.oxlintrc.json`.

## Architecture & conventions
- Redux is **classic**: `combineReducers` in `src/store/rootReducer.ts`; RTK used only for `configureStore` (`src/store/store.ts`, thunks disabled). Do not introduce `createSlice`.
- Async flows follow `*_REQUESTED` → `*_START` / `*_SUCCESS` / `*_ERROR` via `src/store/apiMiddleware.ts`. Side effects are registered in the `apiEffects` map in `src/store/effects.ts` (keyed by action base name); unregistered bases fall back to echoing the payload. Adding an async flow = action constants + action creators (e.g. `src/store/tournamentActions.ts`) **and** an `apiEffects` entry.
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config`).

## pnpm hardening (supply-chain)
- `webapp/pnpm-workspace.yaml` enforces `minimumReleaseAge` (7 days) / `strictDepBuilds` / `blockExoticSubdeps`; only `esbuild` build scripts allowed.
- When adding deps with lifecycle scripts, allow-list with `pnpm approve-builds`. Fresh packages younger than 7 days fail the install.

## Docker / deploy
- `docker-compose.yml` is the **production file Dokploy deploys as-is**. Never add `ports:` — use `expose:` only; Traefik handles public routing/TLS.
- `docker-compose.override.yml` is dev-only (auto-merged by `docker compose up`), never applied on the Dokploy host.
- `webapp/Dockerfile`: `dev` target for the devcontainer/override; default target `production` (nginx static server) for Dokploy.
- `.gitlab-ci.yml` **exists**: `corepack enable` + `pnpm install --frozen-lockfile`, then lint + build, then on `main` deploy to Dokploy via a webhook POST (CI var `DEPLOY_WEBHOOK_URL`). Consult the GitLab CI policy below before modifying it.

## Global policies (Basic Memory, project "main")
- memory://main/guidelines/communication-language-convention-agents.md-claude.md
- memory://main/guidelines/docs-maintenance-policy
- memory://main/guidelines/basic-memory-notes-authoring-guide-for-ai-assistants
- memory://main/guidelines/code-research-codebase-memory-mcp

## Deploy (always applied)
- memory://main/guidelines/infrastructure-dokploy-traefik-no-caddy-for-tls
- memory://main/guidelines/devcontainer-docker-compose-pattern-for-dokploy-deployments
- memory://main/guidelines/git-lab-ci-generating-.gitlab-ci.yml
- memory://main/guidelines/production-access-no-agent-actions-only-commands-for-the-user
