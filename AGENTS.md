# AGENTS.md — poloperator-reffing

## Layout
- `webapp/` — the only app: React 19 + Vite + TypeScript + Tailwind CSS v4 + classic Redux. No backend implemented yet.
- `docs/superpowers/specs/` — dated superpowers specs, committed and authoritative. Domain authority is `docs/superpowers/specs/2026-09-01-poloperator-reffing-design.md` (referee-slotting rules, RSC data source/shape). A NestJS + Postgres backend exists only as a draft spec there (`2026-09-01-nestjs-backend-design.md`) — not built.
- `docs/superpowers/plans/` and `.superpowers/` — superpowers implementation plans and local execution artifacts, generated per session and **gitignored: never commit them** (specs are the durable record).

## Data source (why the proxy exists)
- No API: the app scrapes poloperator.com (Next.js App Router) **RSC flight payloads** — requests need the `rsc: 1` header, RSC dates are prefixed `$D`, ~15 forfeit matches (null `teamBId`) are parsed but excluded from slotting. Details in the design spec above.
- poloperator.com sends **no CORS headers**, so fetches go through a same-origin proxy: Vite `server.proxy` (dev, `vite.config.ts`) and nginx `location /poloperator/` (prod, `webapp/nginx.conf`), both targeting `https://poloperator.com` (`services/poloperator/fetch.ts`, override target with `VITE_POLOPERATOR_BASE`). Keep the `/poloperator` path prefix and rewrite in sync across both proxies and `fetch.ts`.

## Commands (run inside `webapp/`)
- `pnpm install` — keep `pnpm-lock.yaml` in sync (CI/Docker install with `--frozen-lockfile`).
- `pnpm dev` — Vite dev server, **port 3003** (`strictPort`).
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
- `docker-compose.yml` is the **production file Dokploy deploys as-is**. Never add `ports:` — use `expose:` only; Dokploy's Traefik handles public routing/TLS.
- `docker-compose.override.yml` is dev-only (auto-merged by `docker compose up`), never applied on the Dokploy host. Locally the app joins the shared `local-proxy` Caddy network and is reachable at **http://poloperator-reffing.localhost** (no host port published).
- `webapp/Dockerfile`: `dev` target for local Compose; default target `production` (nginx static server) for Dokploy.
- `.gitlab-ci.yml` **exists**: `corepack enable` + `pnpm install --frozen-lockfile`, then lint + build, then on `main` deploy to Dokploy via a webhook POST (CI var `DEPLOY_WEBHOOK_URL`). Consult the GitLab CI rules below before modifying it.

## Global conventions (content copied from Basic Memory, project "main")
- Communication with the user is in French; all code, documentation, and tests are in English. (Réf. « Communication Language Convention (AGENTS.md - CLAUDE.md) »)
- `docs/` and this guidance file are committed alongside the code they document; update them whenever architecture or scope changes. (Réf. « Docs Maintenance Policy »)
- Basic Memory notes:
  - Whenever an instruction says "note" (write a note, capture a decision, check your notes), it means a Basic Memory note written through the MCP tools.
  - Notes are autonomous — never reference external vaults, knowledge bases, or file paths; duplicate or summarize content instead.
  - Search before writing; append observations/relations to `raw`/`candidate` notes; editing a `canonical` note's content needs explicit user authorization. Never rewrite or delete canonical notes — mark them `superseded`.
  - Agents write `raw`/`candidate` content by default; promotion to `canonical` is reserved for the user/curator.
  - Body-first prose, then `- [category] fact #tag` observations and `- relates_to [[Exact Title]]` relations. Core metadata: `memory_class` (episodic/semantic/procedural/working), `lifecycle` (raw/candidate/canonical/superseded/archived), `source` (human/agent/external).
  (Réf. « Basic Memory Notes — Authoring Guide for AI Assistants »)
- Structural code research goes through the **codebase-memory-mcp** knowledge graph, not ad-hoc grep/glob sweeps: `search_graph` (find symbols), `trace_path` (callers/impact), `get_code_snippet`, `get_architecture`, `query_graph` (Cypher), `check_index_coverage`, and `list_projects`/`index_status`/`index_repository` at session start. grep/glob are fallbacks only for string literals, error messages, config values, non-code files, or insufficient graph coverage. This binds superpowers skills too. (Réf. « Code Research — Codebase Memory MCP »)

## Deploy (always applied)
- Infrastructure runs on **Dokploy**, whose built-in **Traefik** handles TLS (Let's Encrypt) automatically. Do not add a Caddy container or TLS config to services deployed via Dokploy. Local development uses a Caddy reverse proxy (caddy-docker-proxy, no TLS) — production stays on Traefik. (Réf. « Infrastructure — Dokploy + Traefik (no Caddy for TLS) »)
- Docker Compose structure: `docker-compose.yml` = production base deployed as-is by Dokploy, `expose:` only (never `ports:`); `docker-compose.override.yml` = local-development-only additions (bind mount, dev target/command, dev env, local data bind-mounts). No devcontainer is required. In the override, bind-mount each named volume to `./volumes/<volume-name>` (add `volumes/` to `.gitignore`; pre-create and chown the folder to the container UID). For locally proxied HTTP services, add the shared `local-proxy` network and Caddy labels (`caddy: <project>.localhost`, `caddy.reverse_proxy: "{{upstreams <port>}}"`) in the override only. (Réf. « Docker Compose Development + Dokploy Deployment Pattern »)
- GitLab CI pipeline: detect project type, run lint/test/build, then a deploy job that POSTs to `${DEPLOY_WEBHOOK_URL}` on `main`. That URL is a GitLab CI variable set in the project's CI/CD settings — never hardcode it or ask the user for it. (Réf. « GitLab CI — Generating .gitlab-ci.yml »)
- **Production access**: when the conversation touches production, the agent must perform **no** direct action (no bash/docker/ssh/restarts on the prod system). Explain what and why, hand the exact commands to the user in a delimited block, and wait for the output. Never reach the production host from the agent's shell. (Réf. « Production Access — No Agent Actions, Only Commands for the User »)
