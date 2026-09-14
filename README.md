# poloperator-reffing

## Stack
- **webapp/** — React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux (classic)

## Development

This project uses Docker Compose for local development.

- **Local dev**: from the project root, run `docker compose up`. Compose automatically
  merges `docker-compose.override.yml` on top of `docker-compose.yml`, including the
  project bind mount, hot reload, and development settings. The app joins the shared
  `local-proxy` Caddy network and is reachable at **http://poloperator-reffing.localhost**
  — no host port is published.
- **Production (Dokploy)**: Dokploy deploys `docker-compose.yml` as-is. Services use
  `expose` (not `ports`) — Dokploy's reverse proxy (Traefik) handles TLS and public
  routing internally, so no host port is published. Do not add `ports:` mappings to
  this file.

## Webapp

```sh
cd webapp
pnpm install
pnpm dev        # http://localhost:3003 (Vite, strictPort)
pnpm test       # vitest — prediction engine, RSC parser, replay validation
pnpm run build
pnpm run lint
```

Async data flows follow the `*_REQUESTED` → `*_START` / `*_SUCCESS` / `*_ERROR`
action pattern via `src/store/apiMiddleware.ts`. See the design doc at
`docs/superpowers/specs/2026-09-01-poloperator-reffing-design.md`.
