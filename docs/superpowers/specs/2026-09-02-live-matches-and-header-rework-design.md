# Design — Live matches card, wave horizons, and header rework

Date: 2026-09-02
Status: Approved (design decisions locked with the user)

## Context

Feedback gathered in `IMPROVEMENTS.md` after reviewing the Style Kit restyle and
the current app behavior:

1. Header should be a single row: title left, refresh in the middle, config right.
2. The tournament picker moves out of the header, below it.
3. Missing spacing between the "Voir sur Poloperator" link and the text below it.
4. *(empty line — no item)*
5. Feature: matches currently being played ("matchs en cours") should have their
   own card, and upcoming matches should be labelled with their wave horizon.

### Current behavior

- The prediction engine computes referee suggestions for **every** non-finished
  match (all future waves), stored in `TournamentData.suggestionsByMatch`.
- `UpcomingMatches` renders **all** non-finished matches in one flat list, ordered
  by `startAt`. Matches currently being played are mixed in (any match with
  `status !== 'FINISHED'` counts as "à venir").
- The wave granularity is `Slot` (a wave of matches running in parallel). The
  full wave clustering already lives in `TournamentData.slots`.

## Decisions (locked with the user)

- "**en cours**" = matches of the wave currently being played. Detection is
  **status + time**: a match is "started" if its status is a live status
  (`LIVE` / `ONGOING` / `IN_PROGRESS`) or its `startAt` is in the past and it is
  not `FINISHED`. The whole current wave is treated as "en cours".
- "**à venir**" = every other non-finished match, each labelled with its
  chronological wave rank: T+1 (next wave), T+2 (following), etc.
- Card order on the page: "Matchs à venir" first, then "Matchs en cours" (as
  written in the spec).
- "Matchs en cours" card content: teams, score (if present), court, start time,
  and the assigned referee (`refereeName`). **No suggestions** — the wave is
  already being played.
- The "Matchs en cours" card is **hidden** when there are no live matches.

## Approach

**Compute the split and the horizons at render time** from the existing
`slots` + `upcomingMatches` + `Date.now()`. The prediction engine, Redux
reducers/effects, and the RSC parser are **not modified** — suggestions for every
wave already exist.

Rationale: the classification depends on "now", which the UI already re-evaluates
on every render and on the auto-refresh. Deriving it in the engine would freeze
it at fetch time and force data-shape changes for no benefit.

## Design

### Header rework (`src/App.tsx`)

- The header becomes a single row on a 3-column grid
  `grid-cols-[1fr_auto_1fr]`:
  - column 1 (left): title pill "poloperator reffing" + BETA badge;
  - column 2 (center): `RefreshButton`;
  - column 3 (right): the ⚙ settings button (`justify-self-end`).
- The `TournamentPicker` is removed from the header and rendered in its own band
  right below the header (same `max-w-3xl px-6` container, vertical padding).
- The tournament metadata block keeps its current structure, with one fix: add
  top spacing between the title/"Voir sur Poloperator ↗" row and the subtitle
  (`dates · équipes · match à venir`).

### Live matches + horizons

New pure helper in `src/services/prediction/timeline.ts`:

```ts
export interface UpcomingWithHorizon {
  match: Match
  horizon: number // 1 => T+1, 2 => T+2, ...
}

export interface MatchTimeline {
  live: Match[]
  upcoming: UpcomingWithHorizon[]
}

export function classifyMatches(
  slots: Slot[],
  upcomingMatches: Match[],   // non-finished matches, as in TournamentData
  now: Date,
): MatchTimeline
```

Algorithm:

1. Build `matchId → slotIndex` from `slots`.
2. A match is **started** if its status is in `{ LIVE, ONGOING, IN_PROGRESS }`
   or (`status !== 'FINISHED'` and `startAt <= now`). Non-finished is already
   guaranteed by the input.
3. `currentWave` = the **largest** slot index that contains at least one started
   match. (In practice only one wave plays at a time; the max handles overlap.)
4. `live` = all non-finished matches of the current wave (the whole wave,
   including its not-yet-started matches).
5. `upcoming` = the other non-finished matches; `horizon` = the rank of the
   match's slot among the sorted distinct upcoming slot indexes (1-based).
   With a live wave present, the first upcoming wave is T+1; with no live wave
   (e.g. between waves, pre-tournament), the first scheduled wave is T+1.

Component changes:

- New `src/components/LiveMatches.tsx` — renders the "Matchs en cours" card
  (same card language as `UpcomingMatches`): date/time, court, teams, score when
  present, assigned referee. No suggestion list. Hidden when `matches.length === 0`.
- `src/components/UpcomingMatches.tsx` — takes `upcoming: UpcomingWithHorizon[]`;
  each match card gets a horizon badge (e.g. `T+1`) next to the date/time. The
  list is ordered by wave then `startAt`.
- `src/App.tsx` — computes
  `const timeline = classifyMatches(data.slots, data.upcomingMatches, new Date())`
  at render time; passes `timeline.live` to `LiveMatches` and
  `timeline.upcoming` to `UpcomingMatches`. Renders "Matchs à venir" then
  "Matchs en cours" (hidden when empty), then `RefereeCounts`.
- Tournament subtitle counts: "X match à venir" uses the upcoming count; when
  `live` is non-empty, append "· Y en cours".

## Data flow

No change to Redux, `apiMiddleware`/effects, RSC parser, or `buildPrediction`.
`TournamentData.slots` already contains every playable wave. Suggestions for all
waves already exist in `suggestionsByMatch` and continue to render inside the
"à venir" cards.

## Tests

New `src/services/prediction/timeline.test.ts` (vitest, node env) covering:

- live detection by status and by `startAt`; non-live scheduled matches excluded;
- whole-wave grouping (a not-yet-started match of the current wave is "en cours");
- horizon ranking: T+1 / T+2 for consecutive waves, skipped waves still ranked;
- no live wave → empty `live`, first scheduled wave labelled T+1;
- `FINISHED` matches never appear.

Existing tests (`pnpm test`), `pnpm run build`, and `pnpm run lint` must pass.

## Verification

- `pnpm run build` (tsc + vite) passes.
- `pnpm run lint` (oxlint) passes.
- `pnpm test` passes.
- Manual (`pnpm dev`, port 3003): header one line (title/refresh/config), picker
  below header, spacing around the poloperator link; with a fixture or live
  tournament, the "en cours" card appears below "à venir" with scores/referee and
  upcoming cards carry T+1/T+2 badges.

## Out of scope

- Changing the prediction engine or its tier logic.
- Backend / NestJS work.
- Dark theme or other kit tokens.
- Re-ordering cards differently from the approved "à venir" → "en cours" order.

## Amendment — 2026-09-18

`buildPrediction` no longer passes `skipAssigned: true`: an upcoming match that
already has a recorded referee now also gets suggestions, and `UpcomingMatches`
displays the assigned referee(s) above them. This supersedes the "prediction
engine ... not modified" and "changing the prediction engine" lines above; the
tier logic is still untouched. See
`2026-09-18-assigned-referee-in-upcoming-design.md`.