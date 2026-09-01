# webapp

React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux (classic).

See the root [README](../README.md) for setup, devcontainer, and deployment.

```sh
pnpm install
pnpm dev        # http://localhost:3003 (Vite, strictPort)
pnpm test       # vitest (prediction engine, RSC parser, replay validation)
pnpm run build  # tsc -b && vite build
pnpm run lint
```

## Architecture

- `src/services/poloperator/fetch.ts` — HTTP client for poloperator.com, calls
  the same-origin `/poloperator/...` path (proxied in dev by Vite, in prod by
  `nginx.conf`; override with `VITE_POLOPERATOR_BASE`).
- `src/services/poloperator/parseRsc.ts` — extracts tournaments, teams and
  matches from the RSC flight payloads.
- `src/services/prediction/` — pure referee-prediction engine (slotting,
  referee matching by player id, balanced suggestions). See the design doc
  `docs/superpowers/specs/2026-09-01-poloperator-reffing-design.md`.
- Async data flows follow the `*_REQUESTED` → `*_START` / `*_SUCCESS` / `*_ERROR`
  action pattern via `src/store/apiMiddleware.ts`, with side effects registered
  in `src/store/effects.ts`.