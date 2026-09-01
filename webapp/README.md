# webapp

React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux (classic).

See the root [README](../README.md) for setup, devcontainer, and deployment.

```sh
pnpm install
pnpm dev        # http://localhost:3000
pnpm run build
pnpm run lint
```

Async data flows follow the `*_REQUESTED` → `*_START` / `*_SUCCESS` / `*_ERROR`
action pattern via `src/store/apiMiddleware.ts`.