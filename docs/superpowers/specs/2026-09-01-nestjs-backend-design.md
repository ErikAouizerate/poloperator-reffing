# NestJS + PostgreSQL Backend — Design

Date: 2026-09-01
Status: Draft

## Context

`poloperator-reffing` currently contains only `webapp/` (React 19 + Vite + TypeScript
+ Tailwind v4 + classic Redux), which is a stub. There is no backend yet; the webapp's
`apiMiddleware` is stubbed. The user wants a NestJS backend with a PostgreSQL database,
following the Basic Memory scaffolding setup.

## Goals

- Stand up a **minimal NestJS backend skeleton** — no business logic yet.
- PostgreSQL database wired in via **Drizzle ORM** (schema + migrations tooling).
- Integrate with the existing Docker Compose / devcontainer / Dokploy / GitLab CI setup.
- Follow Basic Memory policies: pnpm, TypeScript by default, devcontainer + compose
  pattern (base file `expose` only, dev-only override), Dokploy + Traefik, no Caddy.

## Non-goals

- No business features / domain entities yet (webapp is still a stub).
- No authentication.
- No monorepo refactor of `webapp/` (kept as a standalone pnpm project).
- No new TLS/Caddy infrastructure.

## Approach

Standalone `backend/` folder (one folder per stack, per the scaffolding blueprint).
`webapp/` is left untouched.

## Structure

```
backend/
  src/
    main.ts              # NestJS bootstrap (Fastify), CORS, port 3001
    app.module.ts        # ConfigModule, DrizzleModule, HealthModule
    db/
      schema.ts          # Drizzle schema (empty for now; tables to come)
      drizzle.module.ts  # Drizzle provider (pg Pool)
    health/
      health.controller.ts   # GET /health -> { status: 'ok', db: 'up' }
  drizzle.config.ts      # drizzle-kit config (schema -> SQL)
  package.json           # pnpm, TypeScript strict
  Dockerfile             # dev + production targets (mirrors webapp pattern)
  AGENTS.md              # backend policies
```

## Stack decisions

- **Framework**: NestJS with **Fastify** adapter (`@nestjs/platform-fastify`).
- **Package manager**: pnpm (policy). Lockfile `pnpm-lock.yaml`, `pnpm-workspace.yaml`
  with the supply-chain hardening settings (minimumReleaseAge, strictDepBuilds, etc.).
- **ORM**: Drizzle ORM (`drizzle-orm` + `pg`), `drizzle-kit` for migration SQL.
- **Config**: `@nestjs/config` for env vars (`DATABASE_URL`, etc.).
- **Language**: TypeScript strict (policy: TypeScript by default).
- **Port**: 3001 (webapp is 3003).
- **CORS**: allow `http://localhost:3003` (webapp dev origin).
- **Health**: `GET /health` returns `{ status: 'ok', db: 'up' }`, including a DB ping.

## Infrastructure

### docker-compose.yml (production, deployed as-is by Dokploy — `expose` only)

```yaml
services:
  app:                      # existing webapp service, unchanged
  backend:
    build: { context: ./backend }
    expose: ["3001"]
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://...@db:5432/...
    depends_on: [db]
  db:
    image: postgres:16-alpine
    expose: ["5432"]
    environment:
      POSTGRES_USER: ...
      POSTGRES_PASSWORD: ...
      POSTGRES_DB: ...
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### docker-compose.override.yml (dev only)

- `backend`: `target: dev`, bind-mount `./backend:/workspace`, `ports: 3001:3001`,
  dev env.
- `db`: `ports: 5432:5432`, bind-mount data to `./volumes/pgdata` (folder pre-created,
  chown to container UID; `volumes/` already gitignored).
- `app`: unchanged.

### .devcontainer/devcontainer.json

- Add `3001` and `5432` to `forwardPorts`.

### .gitlab-ci.yml

- Add `backend/` install/lint/build jobs (pnpm, mirroring the webapp jobs).
- Deploy job unchanged (`${DEPLOY_WEBHOOK_URL}`).

### Documentation

- New `backend/AGENTS.md` referencing the applicable Basic Memory policies
  (pnpm policy, TypeScript by default, backend scope).
- Update root `AGENTS.md` (Stack: add `backend/`).
- Update root `README.md` (stack list, dev ports, backend commands).

## Production deployment (Dokploy)

Dokploy deploys `docker-compose.yml` as-is → three services (app, backend, db) with a
persistent `pgdata` volume. Traefik routes public traffic to the webapp; the backend is
reached internally on the Docker network (no host ports published).

## Error handling

- Backend boot fails fast if the DB is unreachable (explicit connection error).
- `/health` reports DB ping result; non-OK DB state is surfaced in the response body.

## Testing

- No test framework configured in this repo (policy). The skeleton ships with a
  `build` (`tsc`) typecheck and lint. A DB-ping check is exercised via `/health`.

## Open questions

None — decisions locked in the sections above.