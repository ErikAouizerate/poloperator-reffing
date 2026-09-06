# Design — Help button & explanation modal

Date: 2026-09-06
Status: draft

## Goal

Add a help button in the top-right of the header that opens a modal explaining
how the app works, focused on three topics: the suggestion **tiers**, the
**multi-referee rules**, and the **refresh system**. Content must be clear and
concise, in French (UI copy), matching the existing style kit.

## Decisions validated with the user

- The "multiple referees" section covers **both** rules:
  1. parallel matches in the same wave never get the same team as their top
     suggestion (`usedTeams` in `suggestForSlot`);
  2. on a finished match, a referee and a co-referee from **different teams**
     each count +1 for their team (same team → a single +1).
- Purely presentational modal: no Redux, no persistence, no first-visit
  auto-open (YAGNI).
- Reuse the `SettingsModal` interaction pattern (Escape key, backdrop click,
  "Fermer" button).

## Architecture

Approach A (chosen over "help section inside SettingsModal" and "dedicated
page" — no router in the app): a standalone `HelpModal.tsx` component driven by
local `useState` in `App.tsx`, following the existing modal pattern.

Targeted improvement while touching this code: `TIER_LABEL` / `TIER_BG` are
currently private to `UpcomingMatches.tsx`. Extract them to a shared module so
the help modal renders the exact same badges (single source of truth).

## Files

### `webapp/src/components/tierStyles.ts` (new)

```ts
export const TIER_LABEL: Record<number, string> = {
  1: 'Optimum',
  2: 'OK',
  3: 'Moins pire',
  4: 'À éviter',
}

export const TIER_BG: Record<number, string> = {
  1: 'bg-teal',
  2: 'bg-yellow',
  3: 'bg-orange',
  4: 'bg-red',
}
```

### `webapp/src/components/UpcomingMatches.tsx`

Remove the local `TIER_LABEL` / `TIER_BG` constants, import them from
`./tierStyles`. No other change.

### `webapp/src/components/HelpModal.tsx` (new)

- Props: `{ open: boolean; onClose: () => void }`.
- Same shell as `SettingsModal`: fixed overlay `bg-ink/60`, `role="dialog"`,
  `aria-modal`, `aria-label="Aide"`, Escape listener while open, backdrop click
  closes, inner panel stops propagation, "Fermer" button at the bottom.
- Panel: `w-full max-w-lg rounded-[14px] border-2 border-ink bg-surface p-6
  shadow-kit`, plus `max-h-[85vh] overflow-y-auto` (text-heavy content, small
  screens).
- Static French copy, three sections:

**1. « Les niveaux de suggestion »** — intro sentence + four tier badges
(rendered with `TIER_LABEL` / `TIER_BG`):

- Intro: base rule — « Une équipe qui joue à la vague T arbitre deux vagues
  avant (T−2) et se repose à T−1. L'application propose, l'organisateur
  décide. »
- **Optimum** — next match at T+2: refereeing now keeps the rest slot before
  their match.
- **OK** — next match at T+3.
- **Moins pire** — no close known next match (eliminated, end of day, next
  match ≥ T+4); teams that played exactly two waves ago come first (they are
  due to referee).
- **À éviter** — "chain": team plays at the next wave (T+1) or just played
  (T−1), so no rest between match and refereeing.
- Tie-break line: within the same tier, the team with the fewest referee
  duties comes first, then the one waiting the longest.

**2. « Plusieurs arbitres »** — the two validated rules, one sentence each:

- Parallel matches: two matches of the same wave never get the same team as
  their top suggestion.
- Referee + co-referee: on finished matches, if they belong to different teams
  each team gets +1 in the referee counts; same team counts once.

**3. « Rafraîchissement »**

- Auto-refresh every 4 minutes by default, adjustable from 15 s to 60 min via
  the ⚙ settings button.
- The « Rafraîchir » button shows the countdown; clicking it refreshes
  immediately and restarts the timer.
- Suggestions and referee counts are recomputed from poloperator.com data on
  every refresh.

### `webapp/src/App.tsx`

- New local state: `const [helpOpen, setHelpOpen] = useState(false)`.
- New round button in the header right group, **after** the ⚙ settings button
  (rightmost): `?` character, `aria-label="Aide"`, `title="Aide"`, same classes
  as the existing round buttons (`flex h-9 w-9 items-center justify-center
  rounded-full border-2 border-ink bg-surface text-sm text-ink hover:bg-teal`).
- Render `<HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />`
  next to `<SettingsModal>`.

## Testing & verification

The modal is purely presentational static content; the project has no `.tsx`
component tests configured (vitest node env, `src/**/*.test.ts` only), so no
new test file. Verification:

- `pnpm run lint` (oxlint)
- `pnpm run build` (`tsc -b && vite build` — typecheck included)

No new dependency (nothing to `pnpm approve-builds`).

## Out of scope

- No first-visit auto-open or "seen" persistence (localStorage).
- No dedicated help page / route.
- No i18n framework — French UI copy hardcoded like the rest of the app.
- No change to `SettingsModal` content.
