# Design — Referee count first within a tier

Date: 2026-09-19
Status: approved, implemented

## Problem

The referee prediction engine (`webapp/src/services/prediction/index.ts`) ranks
candidates per slot (a "créneau" = a wave of parallel matches). Within **tier 3**
(the fallback for candidates with no known next match), the ordering used the
candidate's **rest group** before its referee count: teams that played at T−2
came first, then teams that played earlier, then teams that just played at T−1,
and only then were ties broken by fewest duties.

At the end of a round (e.g. the last wave of the day) nearly every candidate
falls into tier 3, so a team with many referee duties — but "due" by rest
rhythm — was displayed ahead of teams with fewer or no duties. In practice the
organizer wants the raw balance signal to lead.

## Rule (validated with the user)

Within a **same tier**, sort by **fewest referee duties first**
(`refereeCount` ascending).

- Tiers are still compared first (1 → 4).
- The **rest group** becomes a **tie-break**, applied only to tier 3 once
  referee counts are equal: played at T−2 first, then played earlier (or never),
  then played at T−1.
- Remaining tie-breaks are unchanged: longest without refereeing
  (`lastRefSlotIndex`), then team name.

Tiers 1 and 2 are unaffected other than the (already effective) referee-count
ordering.

## Files

- `webapp/src/services/prediction/index.ts` — `compareSuggestions` compares
  `refereeCount` before the tier-3 `restGroup` block; comments updated.
- `webapp/src/services/prediction/prediction.test.ts` — sorting invariant now
  asserts tier → refereeCount → rest group; the synthetic tie-break test now
  checks that a 1-duty team at T−2 ranks behind 0-duty teams.
- `webapp/src/components/HelpModal.tsx` — tier-3 copy updated.

## Testing

- `pnpm exec vitest run src/services/prediction/prediction.test.ts`
- `pnpm test` (includes the replay-balance validation)
- `pnpm run build`, `pnpm run lint`
