# Design — poloperator-reffing

Date: 2026-09-01
Status: implemented (MVP)

## Goal

From a poloperator.com tournament, propose which teams should referee the
upcoming matches, keeping referee duties balanced across teams.

## Referee rule (validated with the user)

- Granularity: a **créneau (slot)** = a wave of matches running in parallel on
  the courts.
- A team that plays at slot T referees **two slots earlier (T−2)** and rests at
  T−1 ("ref, rest, play").
- Preference order when several teams are eligible (balanced duty rotation):
  1. **Tier 1** — teams whose next match is exactly at T+2, fewest referee
     duties first.
  2. **Tier 2** — teams whose next match is in [T+1, T+3], fewest duties first.
  3. **Tier 3** — any team not playing the slot (no known next match): first
     teams whose most recent match was at T−2 (duty rotation with rest), then
     teams that played earlier (incl. eliminated / done for the day), then
     teams that just played at T−1. Within each group, fewest duties first,
     then longest without refereeing.
- The app **proposes** (an ordered list per match); the organizer decides.

## Data source

Poloperator is a Next.js App Router site. Its pages return **RSC flight data**
(stream of `ref:json` lines) when requested with the `rsc: 1` header. The
public pages work **without authentication**:

- `GET /fr/tournaments` — list of all tournaments (slug, name, city, dates…).
- `GET /fr/tournament/<slug>?tab=schedule` — matches AND team rosters.
  - Match fields: `id`, `startAt`, `courtName`, `status`, `phase`, `teamAId`,
    `teamBId`, `scoreA`, `scoreB`, `refereePlayerId`, `referee.name`,
    `events[]` (`type`, `createdAt`, `matchClockSec`).
  - Tournament fields: `gameDurationMin` (match duration in minutes; 15 by
    default when absent).
  - Rosters: team objects with a `players` array of `TeamPlayer` entries; the
    real player id is `playerId` (not the entry `id`).
- **Referee → team matching is done by player id** (`refereePlayerId` against
  roster `playerId`s), not by name. Verified 114/114 on the Montpellier data.
  (Name-based matching is not needed and ambiguous — homonyms exist.)

Notes:
- RSC dates are prefixed with `$D`; the parser strips it.
- ~15 forfeit matches (a null `teamBId`) exist in the sample tournament; they
  are parsed but excluded from slotting/prediction.
- Waiting-list teams carry the same team shape as confirmed teams (id, name,
  `players`) but have `selected: false`. `extractTournamentRosters` keeps only
  participating teams (`selected !== false`, so a missing flag is kept), which
  keeps the team count, the referee-count table and the suggestions free of
  teams that never play. `guaranteed` and `waitlistPosition` are not reliable
  discriminators across tournaments.

## Architecture (front-only, no backend)

```
src/
  types/poloperator.ts              — TournamentSummary, Team, Match, Slot, …
  services/poloperator/fetch.ts     — HTTP client, proxy-aware
  services/poloperator/parseRsc.ts  — RSC stream parser + shape extractors
  services/prediction/slots.ts      — time-wave clustering (10 min tolerance)
  services/prediction/matchClock.ts — event-log match clock + remaining time
  services/prediction/index.ts      — model, suggestForSlot, refereeCounts
  store/                           — classic Redux + apiMiddleware registry
  components/                       — TournamentPicker, UpcomingMatches, RefereeCounts
```

- Roster player names are extracted by `parseRsc` (`Team.playerNames`) and shown
  under the team name in the counts table (`RefereeCounts`).

- **CORS is blocked** on poloperator.com (no `Access-Control-Allow-Origin`), so
  the app calls a same-origin path `/poloperator/...` that is proxied:
  - dev: Vite `server.proxy` (`/poloperator` → `https://poloperator.com`)
  - prod: `proxy_pass` in `webapp/nginx.conf` (config only — no backend app)
  - overridable via `VITE_POLOPERATOR_BASE`.
- Redux: classic pattern through `apiMiddleware`; the stub was replaced by a
  side-effect registry (`store/effects.ts`) keyed by action base name.
- The referee prediction is a **pure function** (`buildPrediction`), computed in
  the `TOURNAMENT_LOAD` effect and stored in Redux.

## Slotting

Matches are clustered by `startAt`: a new slot starts when a match begins more
than `SLOT_TOLERANCE_MINUTES` (10) after the first match of the current wave.
Real courts run staggered waves (3 then 2 matches), so a 10-min window is a
good compromise on the sample data.

## Live match countdown

Mirrors poloperator.com's own match clock. `matchClock(events, now)` rebuilds
the elapsed match time from the event log: the last `START` anchors the clock
(its `matchClockSec` offset plus real time since `createdAt`); a `PAUSE` or
`END` freezes it on that event's `matchClockSec`. `formatRemaining(clockSec,
gameDurationMin)` then counts down the regulation time and, once over, shows
the overtime as `+mm:ss` in red. Matches in the current wave that have not
started yet show the full match duration frozen (e.g. `10:00`) in a muted
style — no "En direct" badge — and start ticking once `startAt` passes. When a
started match carries no `events[]`, the countdown falls back to `now −
startAt`.

## Validation (Montpellier Mixed #3, finished tournament)

- 169 matches, 19 teams, 114 recorded referee assignments — all resolved to a
  team by player id.
- Replay: predicting each past wave using only prior waves, the recorded
  referee was **inside the top 3 suggestions in 89%** of matches (top-1 5.3% —
  the real tournament was NOT balanced: Nicorette refereed 18 times, FourMula 1).
- Simulation: following the top suggestion at every wave yields a tight
  rotation — **[7..9] refereeing duties per team (σ 0.7)** vs reality's
  [1..18] (σ 3.9).

## Tests

Vitest (`pnpm test`), zero extra infra — node environment. Fixtures:
`services/poloperator/__fixtures__/` (real raw RSC payloads + a clean data
fixture). The raw `montpellier.rsc.json` is a trimmed copy of the real payload
(events stripped) to keep the repo lean.