# Design — Poloperator overlay re-styled in an iframe

Date: 2026-09-30
Status: implemented

## Goal

Display poloperator.com's per-court live overlay inside this app (browser and
OBS browser source) with targeted visual adjustments:

- header bar (court + tournament name) **hidden**
- status / match clock moved to the **far right of the score line**, after the
  second team's name, and rendered smaller
- reduced internal spacings

Live-updating behavior is preserved with no re-implementation.

## Context and constraints

- The overlay page
  (`/fr/tournament/<slug>/overlay?court=N&theme=dark`) is a Next.js App Router
  page, server-rendered, and styled **almost entirely with inline styles** — the
  overlay card has no class names. CSS overrides therefore use inline-style
  signature selectors plus `!important`.
- Live updates come from the page's own client JS (Next.js chunks). Assets are
  requested from absolute paths: `/_next/*`, plus `/icons`, `/icon.png`,
  `/apple-icon.png`, `/manifest.json`.
- poloperator.com sends no CORS headers. The project already proxies
  `/poloperator` → `https://poloperator.com` (Vite dev `server.proxy`, prod
  nginx `location /poloperator/`, client override `VITE_POLOPERATOR_BASE`).
- Redux stays classic; the overlay page needs no Redux.

## Chosen approach: same-origin iframe + CSS injection

`/overlay` renders an `<iframe>` whose `src` is the existing proxy path, so the
framed document is **same-origin**. On `load`, the parent injects a `<style>`
element into the iframe document head. Same-origin makes the injection possible;
the original JS keeps running, so live behavior is native.

Rejected alternatives:

- clone-HTML + polling (loses native live/animations, heavier fetches)
- native re-implementation from RSC data (more code, visual fidelity to rebuild)
- cross-origin iframe + uniform zoom (no targeted tweaks possible)
- OBS Custom CSS alone (no in-project page)

## Route

`/overlay?tournament=<slug>&court=1&theme=dark`

- `tournament`: required; same param name as the app
  (`TOURNAMENT_URL_PARAM`).
- `court`: default `1`.
- `theme`: default `dark`.
- `src/main.tsx` renders `OverlayPage` when
  `window.location.pathname === '/overlay'`, otherwise `App`. A missing
  `tournament` shows a short message.
- No client router: Vite dev SPA fallback and prod nginx
  `try_files ... /index.html` already serve the path.

## OverlayPage

- Full-viewport transparent `<iframe>`, no `sandbox` attribute, with a `title`.
  The component's root element carries the `overlay-page` class.
- `src = /poloperator/fr/tournament/${encodeURIComponent(slug)}/overlay?court=${court}&theme=${theme}`.
- `onLoad`: append `<style id="po-tweaks">` to `iframe.contentDocument.head` if
  absent (idempotent; survives iframe reloads).
- No data fetching, no Redux, no polling.

## Injected tweaks (final)

All rules live in a single `OVERLAY_TWEAKS_CSS` constant in
`src/components/OverlayPage.tsx`, targeting inline-style signatures with
`!important` so they re-apply to nodes re-rendered by the live updates.

1. Header bar (court + tournament) hidden:
   `div[style*="text-transform:uppercase"] { display: none !important; }`
2. The card is the positioning anchor and reserves the clock width:
   `div[style*="min-width:520px"] { position: relative; min-width: 660px;
   padding-right: 72px; }`; the score digits
   (`span[style*="min-width:48px"]`) get `min-width: 40px`.
3. Clock in its own 72px right zone, dark background matching the card
   (`rgba(15, 15, 30, 0.95)`), separated by a `1px solid #ffffff` left
   border, text 16px
   (`span[style*="font-weight:700"][style*="font-size:28px"]`).
4. Team blocks symmetric around the score (`padding: 6px 8px`), score block
   `padding: 4px 6px`, root `padding-top: 4px`, gaps `6px`.
5. Team names never wrap; overflow is truncated with an ellipsis
   (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`), with
   `min-width: 0` on the flex team blocks.

## Proxy additions (dev and prod kept in sync)

Add entries to both `vite.config.ts` and `nginx.conf`, targeting
`https://poloperator.com` with `Host: poloperator.com`:
`/_next/*`, `/icons`, `/icon.png`, `/apple-icon.png`, `/manifest.json`.
Add `/api/*` only if 404s are observed. Router RSC fetches stay under
`/poloperator/...` (the framed document path) and are already proxied. No
upstream asset path collides with the app (`/icons.svg`, `/fonts/`, `/assets/`).

## Transparency (OBS)

`html` and `body` backgrounds are transparent when the overlay page is mounted
(`body:has(.overlay-page)` in `index.css`). The upstream overlay already hides
its header/footer and makes its body transparent.

## Risks and mitigations

1. **X-Frame-Options / CSP `frame-ancestors` upstream — verified, no
   mitigation needed**: the overlay response sends no `X-Frame-Options` and
   no `frame-ancestors`; its `style-src 'self' 'unsafe-inline'` permits the
   injected style and `default-src 'self'` is satisfied because all framed
   assets are proxied same-origin.
2. **Missing asset path**: detect in the Network panel, add to the centralized
   list.
3. **Upstream inline-style drift**: all selectors are centralized in one
   constant; fix once.
4. **Card natural size changes upstream** (e.g. `min-width:520px`): the anchor
   selector is updated in the same constant.

## Validation

- `pnpm dev`, open
  `/overlay?tournament=newcastle-abc-newcastle-upon-tyne-2026&court=1`:
  correct layout, live scores, no 404.
- Test as an OBS browser source: transparent background and positioning.
- `pnpm run lint` and `pnpm run build` (typecheck is part of build).
- No unit test: no jsdom / component test setup exists; the change is proxy
  config plus a DOM/iframe component.

## Docs update

Root `AGENTS.md` and `webapp/AGENTS.md` document the proxy setup; add the new
proxy paths and the `/overlay` route there as part of the implementation.

## Out of scope

Court picker UI, backend, broad visual redesign, light theme.
