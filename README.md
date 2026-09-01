# poloperator-reffing

## Stack
- **webapp/** — React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux (classic)

## Development

This project uses a devcontainer + Docker Compose setup.

- **Launch the devcontainer (VS Code)**: open the repo in VS Code and "Reopen in
  Container" — VS Code reads `.devcontainer/devcontainer.json` and builds the
  container from `docker-compose.yml` + `docker-compose.override.yml`.
- **Launch the devcontainer (CLI)**: install the devcontainer CLI with
  `npm install -g @devcontainers/cli`, then from the project root run:
  `devcontainer up --workspace-folder .`.
- **Local dev without VS Code**: `docker compose up` — automatically merges
  `docker-compose.override.yml` on top of `docker-compose.yml` (bind-mounted source,
  hot reload, port `3000` exposed to `localhost`).
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