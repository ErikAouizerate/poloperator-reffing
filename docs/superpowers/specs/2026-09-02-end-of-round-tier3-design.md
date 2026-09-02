# Design — End-of-round referee rule (tier 3 "t−2") & player names in counts table

Date: 2026-09-02
Status: approved, ready to implement

## Problem

The referee prediction engine (`webapp/src/services/prediction/index.ts`) ranks
candidates per slot (a "créneau" = a wave of parallel matches). Tiers 1 and 2
depend on the candidate team's **next known match**: tier 1 = exactly T+2,
tier 2 = in [T+1, T+3]. Tier 3 is the fallback for every other candidate.

In a **Swiss-format tournament** (and at the end of any round / end of the
day), the next round's matches are not published yet (pairings depend on the
current round's results). As a result, at the end of a round nearly every
candidate has no known next match, everything collapses into tier 3, and the
ranking degenerates to (referee count, last referee) — ignoring who actually
played when.

## Rule (validated with the user)

- Tiers **1 and 2 are unchanged** (future-based, when the schedule is known).
- **Tier 3** is now ordered by the candidate's **most recent played slot**
  (past-based, always known):
  1. **played at t−2** — the team is due to referee now (duty rotation) and
     keeps one slot of rest. Sorted by fewest referee duties, then longest
     without refereeing.
  2. **played before t−2** (t−3, t−4…, including teams finished for the day /
     eliminated / never played yet) — sorted by fewest duties.
  3. **played at t−1** — just played with no rest → last resort.
- The rule applies **always** within tier 3 (uniform), not gated on a special
  "round end" detection.
- The app keeps **proposing** an ordered list per match; the organizer decides.

"Played at t−n" = the slot index of the candidate's most recent playable match
strictly before the target slot (mirror of how `nextMatchSlot` looks ahead).

## Player names in the counts table

The "Compteurs d'arbitrage" table (`RefereeCounts.tsx`) currently shows only the
team name. Display the team's **player names underneath the team name** so the
organizer can identify who to send, and still read "who refereed the least"
from the ranking.

- Roster player names exist in the poloperator RSC payload but are dropped by
  the parser — `parseRsc` must extract them into the `Team` model.
- Table sort stays **descending** (unchanged, per user decision).
- Names shown **in the counts table only** (not in the suggestion cards).

## Data flow

```
parseRsc (extractTeam player names)  →  Team.playerNames
prediction/refereeCounts(model)      →  RefereeCountEntry.playerNames
RefereeCounts.tsx                    →  render names under team name
```

## Testing

- Synthetic end-of-round test: with no matches after the target slot, the top
  picks are the teams that played at t−2 (count asc), teams that played earlier
  come next, and teams that played at t−1 come last — all tier 3.
- Existing invariants (tier 1/2 first, exclude playing teams, distinct picks,
  replay balance `max−min ≤ 3`) must keep passing.
- Real RSC fixture test: teams carry non-empty `playerNames`.
- `pnpm test`, `pnpm run lint`, `pnpm run build`.
