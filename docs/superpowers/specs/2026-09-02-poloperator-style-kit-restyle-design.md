# Poloperator Style Kit Restyle — Design

Date: 2026-09-02
Status: Approved

## Context

The `Poloperator Style Kit.html` file is a bundled design kit that defines the visual
language for the Poloperator brand. The current webapp uses a plain dark Tailwind
palette (`neutral-950` background). This spec restyles the existing webapp with the
kit's design tokens.

Scope is **Approach B — restyle only**: the app structure (header, tournament picker,
upcoming matches, referee counts, settings modal) is unchanged. Only the visual layer
is replaced. No nav, hero, or new sections from the kit are added. No Redux logic or
data flow is touched.

Decisions locked with the user:
- **Light theme only** — the kit's dark palette is out of scope.
- **Chivo self-hosted** — extract the woff2 files from the bundle into
  `webapp/public/fonts/`, no Google Fonts CDN.
- **Structure unchanged** — this supersedes an earlier "align on the kit structure"
  answer; the layout stays as-is.

## Design tokens

### Font
- Family: **Chivo**, weights 400 / 500 / 700 / 900.
- Source: extract the three woff2 files embedded in the kit bundle (vietnamese,
  latin-ext, latin subsets per weight) into `webapp/public/fonts/`.
- `@font-face` rules for weights 400, 500, 700, 900 with their three subsets, exactly
  as in the kit's embedded stylesheet.
- Global `font-family: Chivo, 'Helvetica Neue', Helvetica, sans-serif` on `body`.

### Colors (light theme)
Defined as Tailwind v4 theme tokens in `src/index.css` via `@theme`.

| Token            | Value       | Usage                     |
|------------------|-------------|---------------------------|
| `--color-bg`     | `#FAF7EC`   | Page background (crème)   |
| `--color-surface`| `#FFFDF7`   | Cards / inputs (papier)   |
| `--color-ink`    | `#111111`   | Text, borders, shadows    |
| `--color-muted`  | `#6F6A5E`   | Secondary text            |
| `--color-teal`   | `#7FD3D8`   | Active / progress         |
| `--color-pink`   | `#F9AAB6`   | Primary action            |
| `--color-yellow` | `#F6F0A8`   | Badge / "proche" tier     |
| `--color-mint`   | `#6FC39D`   | Completed                 |
| `--color-red`    | `#E94A5F`   | Live / errors             |
| `--color-orange` | `#F2A24A`   | "repli" tier              |
| `--color-chip`   | `#EFECE1`   | Referee bar track         |

### Borders & shadows
- Borders: `2px solid var(--color-ink)`.
- Shadow: hard offset `4px 4px 0 var(--color-ink)` (cards, buttons on hover).
- Radius: `10px` buttons, `12px` inputs, `14px` cards, `999px` pills / avatars.

### Typography rules
- Headings: weight 900, negative letter-spacing (`-0.03em` / `-0.04em`).
- Labels: 11–12px uppercase, letter-spacing `+0.12em` to `+0.18em`, muted or ink.
- Body: 13–15px, `muted` for secondary text.

## Component mapping

All components keep their current markup, props, and behavior; only Tailwind
classes are replaced.

### `src/App.tsx`
- `<main>`: `min-h-svh bg-bg text-ink font-sans`.
- Header: title in weight 900 with tight tracking; subtitle in `text-muted`.
- Gear button: circular, `border-2 border-ink`, surface background (kit's nav
  icon-button language).

### `src/components/TournamentPicker.tsx`
- Label: uppercase 11px label style.
- `<select>`: `border-2 border-ink bg-surface text-ink rounded-lg`, focus state teal.
- "Aucun tournoi" message in `text-muted`.

### `src/components/RefreshButton.tsx`
- Kit button: `border-2 border-ink rounded-[10px] bg-surface text-ink`,
  uppercase 12px letter-spaced label; hover raises the hard shadow.
- Progress bar fill in `bg-teal` with surface track (replaces the neutral bar).

### `src/components/UpcomingMatches.tsx`
- Card per match: `border-2 border-ink bg-surface rounded-[14px] shadow-[4px_4px_0_#111]`.
- Date / time: uppercase small muted labels.
- Court name: kit badge (2px ink border, surface bg).
- Suggestion list rows with tier badges:
  - `T+2` → teal, `proche` → yellow, `repli` → orange (ink text on top).
- Ranking number and team name styled with ink / muted.

### `src/components/RefereeCounts.tsx`
- Bar track: `bg-chip`, fill `bg-teal`.
- Team names in `text-ink`, counts in tabular-nums muted.

### `src/components/SettingsModal.tsx`
- Overlay: `bg-ink/60`.
- Panel: `bg-surface border-2 border-ink rounded-[14px] shadow`.
- Checkbox accent teal; number steppers and selects styled as kit inputs/buttons;
- Close button styled as kit secondary button.

### `src/components/ErrorBanner.tsx` (in App.tsx)
- Kit error style: surface/pink background, `border-2 border-ink`, ink text.

## Out of scope
- Dark theme (kit dark palette).
- Kit nav / hero / extra sections (Approach B).
- Redux, effects, middleware, data services.
- Font weight 400 subset duplication is intentionally kept as in the kit.

## Verification
- `pnpm run build` (tsc + vite) must pass.
- `pnpm run lint` (oxlint) must pass.
- `pnpm test` (vitest) must pass — no behavior changes expected.
- Manual: `pnpm dev` on port 3003, check header, picker, match cards, bars, modal,
  error banner, font rendering.