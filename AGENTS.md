# AGENTS.md — poloperator-reffing

Communication with the user is in French; all code, documentation, and tests are in English.

## Stack
- `webapp/` — React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux (classic). No backend yet (the async middleware is stubbed — see below).

## Commands (run inside `webapp/`)
- `pnpm install` — lockfile is `pnpm-lock.yaml`; keep it in sync (Docker builds with `--frozen-lockfile`).
- `pnpm dev` — Vite dev server, **port 3003** (`strictPort`; README's "localhost:3000" is stale).
- `pnpm run build` — `tsc -b && vite build`: **typecheck is part of build**.
- `pnpm run lint` — **oxlint** (not ESLint); config `.oxlintrc.json`.
- No test framework or test script is configured.

## Architecture & conventions
- Redux is **classic**: `combineReducers` in `src/store/rootReducer.ts`, RTK used only for `configureStore` (`src/store/store.ts`, thunks disabled). Do not introduce `createSlice`.
- All async flows follow the `*_REQUESTED` → `*_START` / `*_SUCCESS` / `*_ERROR` pattern through `src/store/apiMiddleware.ts`. It is currently a stub that resolves with the payload — replace the promise with the real API call.
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config`).

## pnpm hardening (supply-chain)
- `webapp/pnpm-workspace.yaml` enforces `minimumReleaseAge` / `strictDepBuilds` / `blockExoticSubdeps`. Only `esbuild` build scripts are allowed.
- When adding dependencies with lifecycle scripts, allow-list them with `pnpm approve-builds`; fresh packages younger than 7 days fail the install.

## Docker / deploy
- `docker-compose.yml` is the **production file Dokploy deploys as-is**. Never add `ports:` — use `expose:` only; Traefik handles public routing/TLS.
- `docker-compose.override.yml` is dev-only (auto-merged by `docker compose up`), never applied on the Dokploy host.
- `webapp/Dockerfile`: `dev` target for the devcontainer/override; default target `production` (nginx static server) for Dokploy.
- No `.gitlab-ci.yml` exists yet — see deploy policies below before generating.

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
