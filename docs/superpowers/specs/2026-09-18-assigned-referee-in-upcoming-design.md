# Design — Show the assigned referee on upcoming matches

Date: 2026-09-18
Status: implemented

## Problem

On the live tournament `grand-royal-xv-brussels-2026`, the next upcoming match
(wave T+1) already had a referee recorded by poloperator (`Amir Firestone` and
co-referee `emilio`, both from team Organ Döner). `buildPrediction` called
`suggestForSlot(..., { skipAssigned: true })`, so no suggestion entry was computed
for that match. `UpcomingMatches` only renders the suggestion list — unlike
`LiveMatches`, it never displayed the assigned referee. The "Arbitres suggérés"
block was therefore empty, so it looked like the app proposed no referee at all.

A second observation — every candidate for the final wave labelled "Moins pire"
(tier 3) — is **expected** behavior: tiers 1/2 require a known *future* match, and
the last published wave has none. It is left unchanged (see
`2026-09-02-end-of-round-tier3-design.md`).

## Decision (validated with the user)

- For a non-finished match that already has a referee recorded, **show the
  assigned referee(s) and still list suggestions** as alternatives.
- Do **not** change the tier logic for the final wave.

## Approach

- `webapp/src/services/prediction/index.ts`: `buildPrediction` no longer passes
  `skipAssigned: true`; suggestions are computed for every non-finished match,
  assigned or not. The `skipAssigned` option stays on `suggestForSlot` for
  callers that explicitly want to ignore assigned matches.
- `webapp/src/components/UpcomingMatches.tsx`: when `refereeName` /
  `coRefereeName` are present, render a muted `Arbitre assigné : X · Y` line
  above the suggestion list (mirrors `LiveMatches`).

## Note on `usedTeams`

An already-assigned match still reserves its top pick in `usedTeams`, so the
per-wave "distinct top picks" invariant is unchanged. Releasing that reservation
(so a parallel unassigned match could reuse the same top candidate) was tried and
rejected: it double-books the same team across parallel matches in the
replay/simulation validation and widens the simulated spread. See
`webapp/src/services/prediction/validate-replay.test.ts`.

## Tests

- `webapp/src/services/prediction/prediction.test.ts`: a `SCHEDULED` match with a
  `refereePlayerId` still gets a non-empty suggestion list from `buildPrediction`.
- No component test framework (node-only vitest); the display change is verified
  manually against the live tournament.

## Verification

`pnpm test`, `pnpm run lint`, and `pnpm run build` pass inside `webapp/`.
