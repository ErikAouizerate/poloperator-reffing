# Live matches, wave horizons, and header rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the header (title/refresh/config on one row, tournament picker below it), fix the poloperator-link spacing, and split non-finished matches into a hidden-when-empty "Matchs en cours" card plus an "à venir" list labelled with wave horizons (T+1, T+2, …).

**Architecture:** Compute the live/upcoming split and the horizons at render time with a new pure helper (`classifyMatches`) that reuses the existing `slots` clustering and `Date.now()`. The prediction engine, Redux reducers/effects, and RSC parser are untouched — referee suggestions already exist for every wave. New `LiveMatches` component; `UpcomingMatches` gains horizon badges; `App.tsx` wires it all together.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux classic + Vitest (node env, no jsdom).

## Global Constraints

- Communication/docs in English; UI strings in French; code identifiers in English.
- **File style:** new files use the committed repo style (single quotes, no semicolons). Files already reformatted in the working tree (`App.tsx`, `UpcomingMatches.tsx`, `RefreshButton.tsx`) use double quotes + semicolons — match each file's existing local style; do not re-format other files.
- **Do not touch** the prediction engine, Redux, `apiMiddleware`/effects, RSC parser, or `pnpm-lock.yaml`. No new dependencies (nothing for `pnpm approve-builds`).
- The working tree already contains **uncommitted** restyle-iteration changes (`App.tsx`, `index.html`, `index.css`, `RefereeCounts.tsx`, `RefreshButton.tsx`, `UpcomingMatches.tsx`, new fonts). Build on top of them; do not revert or reformat them.
- All commands run from `webapp/` unless stated otherwise.
- `pnpm run build` = `tsc -b && vite build` (typecheck is part of build). `pnpm run lint` = oxlint. `pnpm test` = vitest.

---

### Task 1: `classifyMatches` pure helper + unit tests

**Files:**
- Create: `webapp/src/services/prediction/timeline.ts`
- Test: `webapp/src/services/prediction/timeline.test.ts`

**Interfaces:**
- Consumes: `Slot`, `Match` from `../../types/poloperator`.
- Produces (used by Tasks 2–5):
  - `export const LIVE_STATUSES: ReadonlySet<string>` — values `'LIVE'`, `'ONGOING'`, `'IN_PROGRESS'`.
  - `export interface UpcomingWithHorizon { match: Match; horizon: number }` — `horizon` 1 → T+1, 2 → T+2, …
  - `export interface MatchTimeline { live: Match[]; upcoming: UpcomingWithHorizon[] }`
  - `export function classifyMatches(slots: Slot[], upcomingMatches: Match[], now: Date): MatchTimeline`

- [ ] **Step 1: Write the failing test**

Create `webapp/src/services/prediction/timeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Match, Slot } from '../../types/poloperator'
import { classifyMatches } from './timeline'

function makeMatch(
  id: string,
  startAt: string,
  overrides: Partial<Match> = {},
): Match {
  return {
    id,
    startAt,
    courtName: 'Court 1',
    status: 'SCHEDULED',
    phase: null,
    teamAId: 'a',
    teamBId: 'b',
    scoreA: null,
    scoreB: null,
    refereePlayerId: null,
    refereeName: null,
    ...overrides,
  }
}

function makeSlots(...groups: Match[][]): Slot[] {
  return groups.map((matches, index) => ({
    index,
    startAt: matches[0].startAt,
    matches,
  }))
}

const NOW = new Date('2026-09-05T10:00:00.000Z')

describe('classifyMatches', () => {
  it('treats a match with a live status as started', () => {
    const live = makeMatch('m1', '2026-09-05T11:00:00.000Z', {
      status: 'LIVE',
    })
    const slots = makeSlots([live])
    const { live: liveMatches, upcoming } = classifyMatches(slots, [live], NOW)
    expect(liveMatches.map((m) => m.id)).toEqual(['m1'])
    expect(upcoming).toEqual([])
  })

  it('treats a scheduled match whose startAt is in the past as started', () => {
    const started = makeMatch('m2', '2026-09-05T09:45:00.000Z')
    const slots = makeSlots([started])
    const { live, upcoming } = classifyMatches(slots, [started], NOW)
    expect(live.map((m) => m.id)).toEqual(['m2'])
    expect(upcoming).toEqual([])
  })

  it('marks the whole current wave as live, including not-yet-started matches', () => {
    const m1 = makeMatch('m1', '2026-09-05T11:00:00.000Z', { status: 'LIVE' })
    const m2 = makeMatch('m2', '2026-09-05T11:05:00.000Z')
    const slots = makeSlots([m1, m2])
    const { live } = classifyMatches(slots, [m1, m2], NOW)
    expect(live.map((m) => m.id).sort()).toEqual(['m1', 'm2'])
  })

  it('labels upcoming waves with their chronological horizon', () => {
    const m1 = makeMatch('m1', '2026-09-05T11:00:00.000Z', { status: 'LIVE' })
    const t1 = makeMatch('t1', '2026-09-05T12:00:00.000Z')
    const t2 = makeMatch('t2', '2026-09-05T13:00:00.000Z')
    const slots = makeSlots([m1], [t1], [t2])
    const { live, upcoming } = classifyMatches(slots, [m1, t1, t2], NOW)
    expect(live.map((m) => m.id)).toEqual(['m1'])
    expect(upcoming.map((u) => [u.match.id, u.horizon])).toEqual([
      ['t1', 1],
      ['t2', 2],
    ])
  })

  it('ranks T+1 from the first upcoming wave when nothing is live', () => {
    const t1 = makeMatch('t1', '2026-09-05T12:00:00.000Z')
    const t2 = makeMatch('t2', '2026-09-05T13:00:00.000Z')
    const slots = makeSlots([t1], [t2])
    const { live, upcoming } = classifyMatches(slots, [t1, t2], NOW)
    expect(live).toEqual([])
    expect(upcoming.map((u) => [u.match.id, u.horizon])).toEqual([
      ['t1', 1],
      ['t2', 2],
    ])
  })

  it('never includes finished matches', () => {
    const done = makeMatch('done', '2026-09-05T09:00:00.000Z', {
      status: 'FINISHED',
    })
    const slots = makeSlots([done])
    const { live, upcoming } = classifyMatches(slots, [done], NOW)
    expect(live).toEqual([])
    expect(upcoming).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "./timeline"`.

- [ ] **Step 3: Write the minimal implementation**

Create `webapp/src/services/prediction/timeline.ts`:

```ts
import type { Match, Slot } from '../../types/poloperator'

export const LIVE_STATUSES: ReadonlySet<string> = new Set([
  'LIVE',
  'ONGOING',
  'IN_PROGRESS',
])

export interface UpcomingWithHorizon {
  match: Match
  horizon: number
}

export interface MatchTimeline {
  live: Match[]
  upcoming: UpcomingWithHorizon[]
}

/**
 * Split non-finished matches into the current live wave and the upcoming
 * waves, each upcoming match labelled with its chronological wave rank
 * (horizon 1 = next wave to be played, i.e. T+1).
 *
 * A match is "started" when its status is a live status or its startAt has
 * passed (and it is not FINISHED — callers pass non-finished matches). The
 * whole wave containing a started match counts as live.
 */
export function classifyMatches(
  slots: Slot[],
  upcomingMatches: Match[],
  now: Date,
): MatchTimeline {
  const slotIndexByMatchId = new Map<string, number>()
  for (const slot of slots) {
    for (const match of slot.matches) {
      slotIndexByMatchId.set(match.id, slot.index)
    }
  }

  const nonFinished = upcomingMatches.filter((m) => m.status !== 'FINISHED')
  const isStarted = (match: Match): boolean =>
    LIVE_STATUSES.has(match.status) ||
    new Date(match.startAt).getTime() <= now.getTime()

  const startedSlots = new Set<number>()
  for (const match of nonFinished) {
    const slotIndex = slotIndexByMatchId.get(match.id)
    if (slotIndex !== undefined && isStarted(match)) startedSlots.add(slotIndex)
  }
  const currentWave = startedSlots.size > 0 ? Math.max(...startedSlots) : null

  const upcomingBySlot = new Map<number, Match[]>()
  const live: Match[] = []
  for (const match of nonFinished) {
    const slotIndex = slotIndexByMatchId.get(match.id)
    if (slotIndex === undefined) continue // unslotted: no startAt/teams upstream
    if (slotIndex === currentWave) {
      live.push(match)
    } else {
      const list = upcomingBySlot.get(slotIndex) ?? []
      list.push(match)
      upcomingBySlot.set(slotIndex, list)
    }
  }

  const sortedSlots = [...upcomingBySlot.keys()].sort((a, b) => a - b)
  const rankBySlot = new Map<number, number>()
  sortedSlots.forEach((slotIndex, i) => rankBySlot.set(slotIndex, i + 1))

  const upcoming: UpcomingWithHorizon[] = []
  for (const slotIndex of sortedSlots) {
    const matches = upcomingBySlot.get(slotIndex) ?? []
    matches.sort((a, b) => a.startAt.localeCompare(b.startAt))
    for (const match of matches) {
      upcoming.push({ match, horizon: rankBySlot.get(slotIndex) ?? 1 })
    }
  }

  return { live, upcoming }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — all 6 new cases + the existing suite.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/services/prediction/timeline.ts webapp/src/services/prediction/timeline.test.ts
git commit -m "feat: classify live vs upcoming matches by wave horizon"
```

---

### Task 2: `LiveMatches` component

**Files:**
- Create: `webapp/src/components/LiveMatches.tsx`

**Interfaces:**
- Consumes: `Match` from `../types/poloperator`.
- Produces (used by Task 5): `export function LiveMatches({ matches, teamNameById }: { matches: Match[]; teamNameById: (teamId: string | null) => string })` — renders `null` when `matches` is empty.

- [ ] **Step 1: Write the component**

Create `webapp/src/components/LiveMatches.tsx` (single quotes, no semicolons):

```tsx
import type { Match } from '../types/poloperator'

interface LiveMatchesProps {
  matches: Match[]
  teamNameById: (teamId: string | null) => string
}

function formatMatchDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatMatchTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LiveMatches({ matches, teamNameById }: LiveMatchesProps) {
  if (matches.length === 0) return null

  const sorted = [...matches].sort((a, b) =>
    a.startAt.localeCompare(b.startAt),
  )

  return (
    <section>
      <h2 className="font-display mb-3 text-xl font-bold tracking-tight text-ink">
        Matchs en cours
      </h2>
      <ul className="space-y-3">
        {sorted.map((match) => {
          const hasScore = match.scoreA !== null || match.scoreB !== null
          return (
            <li
              key={match.id}
              className="rounded-[14px] border-2 border-ink bg-surface p-4 shadow-kit"
            >
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>{formatMatchDate(match.startAt)}</span>
                <span className="font-medium text-ink">
                  {formatMatchTime(match.startAt)}
                </span>
                <span className="rounded-md border-2 border-red bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                  En direct
                </span>
                {match.courtName ? (
                  <span className="rounded-md border-2 border-ink bg-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                    {match.courtName}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                <span>{teamNameById(match.teamAId)}</span>
                <span className="text-muted">vs</span>
                <span>{teamNameById(match.teamBId)}</span>
                {hasScore ? (
                  <span className="tabular-nums text-ink">
                    {match.scoreA ?? 0} — {match.scoreB ?? 0}
                  </span>
                ) : null}
              </div>
              {match.refereeName ? (
                <p className="mt-2 text-xs text-muted">
                  Arbitre : {match.refereeName}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `pnpm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/LiveMatches.tsx
git commit -m "feat: add live matches card"
```

---

### Task 3: Horizon badges in `UpcomingMatches`

**Files:**
- Modify: `webapp/src/components/UpcomingMatches.tsx`

**Interfaces:**
- Consumes: `UpcomingWithHorizon` from `../services/prediction/timeline` (Task 1).
- Produces: `UpcomingMatches` now takes `matches: UpcomingWithHorizon[]` (instead of `Match[]`) and renders a `T+{horizon}` badge per card.

- [ ] **Step 1: Update the imports and props**

In `webapp/src/components/UpcomingMatches.tsx` (working-tree style: double quotes, semicolons), change the imports to:

```tsx
import type { Match, RefereeSuggestion } from "../types/poloperator";
import type { UpcomingWithHorizon } from "../services/prediction/timeline";
```

(`Match` stays only if still referenced — after Step 3 it is not; drop it then.) Change the interface:

```tsx
interface UpcomingMatchesProps {
  matches: UpcomingWithHorizon[];
  suggestionsByMatch: Record<string, RefereeSuggestion[]>;
  teamNameById: (teamId: string | null) => string;
  suggestionLimit: number;
}
```

- [ ] **Step 2: Add a horizon badge**

In the date/time row of each card, after the time span and before the court badge, add:

```tsx
              <span className="rounded-md border-2 border-ink bg-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                T+{entry.match.horizon}
              </span>
```

- [ ] **Step 3: Render from the wrapped entries**

Replace the sort and the card body to iterate over the wrapped entries:

```tsx
  const sorted = [...matches].sort((a, b) =>
    a.match.startAt.localeCompare(b.match.startAt),
  );
```

Inside the `map`, use `entry.match` for every `match.…` access (`key={entry.match.id}`, `formatMatchDate(entry.match.startAt)`, `formatMatchTime(entry.match.startAt)`, `match.courtName` → `entry.match.courtName`, `teamNameById(entry.match.teamAId)`, `teamNameById(entry.match.teamBId)`), and the suggestion list stays keyed by `entry.match.id`:

```tsx
        {sorted.map((entry) => (
          <li
            key={entry.match.id}
            className="rounded-[14px] border-2 border-ink bg-surface p-4 shadow-kit"
          >
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>{formatMatchDate(entry.match.startAt)}</span>
              <span className="font-medium text-ink">
                {formatMatchTime(entry.match.startAt)}
              </span>
              <span className="rounded-md border-2 border-ink bg-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                T+{entry.match.horizon}
              </span>
              {entry.match.courtName ? (
                <span className="rounded-md border-2 border-ink bg-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                  {entry.match.courtName}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <span>{teamNameById(entry.match.teamAId)}</span>
              <span className="text-muted">vs</span>
              <span>{teamNameById(entry.match.teamBId)}</span>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-muted">
                Arbitres suggérés
              </p>
              <ol className="space-y-1">
                {(suggestionsByMatch[entry.match.id] ?? [])
                  .slice(0, suggestionLimit)
                  .map((s, i) => (
                    <li
                      key={s.teamId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-5 text-center text-xs text-muted">
                        {i + 1}.
                      </span>
                      <span className="text-ink">{s.teamName}</span>
                      <span
                        className={`rounded-md border-2 border-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink ${TIER_BG[s.tier]}`}
                      >
                        {TIER_LABEL[s.tier]}
                      </span>
                      <span className="text-xs text-muted">
                        {s.refereeCount} arbitrage
                        {s.refereeCount > 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
              </ol>
            </div>
          </li>
        ))}
```

If `Match` is no longer referenced anywhere in the file, remove it from the import so oxlint's unused-import error does not fire.

- [ ] **Step 4: Build to verify it compiles**

Run: `pnpm run build`
Expected: PASS (typecheck catches any remaining `match.` references).

- [ ] **Step 5: Lint**

Run: `pnpm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/components/UpcomingMatches.tsx
git commit -m "feat: label upcoming matches with wave horizon"
```

---

### Task 4: Header rework and picker band in `App.tsx`

**Files:**
- Modify: `webapp/src/App.tsx`

**Interfaces:**
- Consumes: existing `TournamentPicker`, `RefreshButton`, `SettingsModal` (unchanged props).
- Produces: header on one row (title left / refresh center / config right), picker moved below the header, spacing under the poloperator link.

- [ ] **Step 1: Rework the header**

In `webapp/src/App.tsx` (working-tree style: double quotes, semicolons), replace the header block (currently `flex flex-wrap items-center justify-between` wrapping title, picker, refresh, ⚙) with a 3-column grid where the picker is removed:

```tsx
      <header className="border-b-2 border-ink bg-surface">
        <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-[10px] border-2 border-ink px-3 py-1.5 shadow-kit">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full border-2 border-red"
              />
              <span className="font-display text-[17px] font-bold tracking-tight">
                poloperator reffing
              </span>
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              BETA
            </span>
          </div>
          <RefreshButton
            loading={listLoading || selected.loading}
            onRefresh={handleRefresh}
          />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Configuration"
            className="flex h-9 w-9 items-center justify-center justify-self-end rounded-full border-2 border-ink bg-surface text-sm text-ink hover:bg-teal"
          >
            ⚙
          </button>
        </div>
      </header>
```

- [ ] **Step 2: Move the picker below the header**

In the `<div className="mx-auto max-w-3xl px-6 py-8">` container, at the very top (before the `listError` banner), insert the picker band:

```tsx
        <div className="mb-8">
          <TournamentPicker
            tournaments={pickerList}
            loading={listLoading}
            selectedSlug={selectedSlug}
            onSelect={handleSelect}
          />
        </div>
```

- [ ] **Step 3: Fix the spacing under the poloperator link**

In the tournament metadata block, change the subtitle paragraph class from `text-sm text-muted` to `mt-1 text-sm text-muted`:

```tsx
              <p className="mt-1 text-sm text-muted">
                {formatTournamentDates(summary)} · {selected.data.teams.length}{" "}
                équipes · {selected.data.upcomingMatches.length} match à venir
                {selected.data.upcomingMatches.length > 1 ? "s" : ""}
              </p>
```

- [ ] **Step 4: Build to verify it compiles**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `pnpm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/App.tsx
git commit -m "style: single-row header with centered refresh and picker below"
```

---

### Task 5: Wire the timeline into the page

**Files:**
- Modify: `webapp/src/App.tsx`

**Interfaces:**
- Consumes: `classifyMatches` (Task 1), `LiveMatches` (Task 2), the new `UpcomingMatches` prop type (Task 3).
- Produces: subtitle counts split by live/upcoming; `LiveMatches` rendered under `UpcomingMatches`, hidden when empty.

- [ ] **Step 1: Add imports**

In `webapp/src/App.tsx`, add next to the existing component imports:

```tsx
import { LiveMatches } from "./components/LiveMatches";
import { classifyMatches } from "./services/prediction/timeline";
```

- [ ] **Step 2: Compute the timeline at render time**

After the `teamNameById` memo and before `handleRefresh`, add:

```tsx
  const timeline = selected.data
    ? classifyMatches(
        selected.data.slots,
        selected.data.upcomingMatches,
        new Date(),
      )
    : { live: [], upcoming: [] };
```

- [ ] **Step 3: Update the subtitle counts**

Replace the subtitle paragraph (from Task 4) with:

```tsx
              <p className="mt-1 text-sm text-muted">
                {formatTournamentDates(summary)} · {selected.data.teams.length}{" "}
                équipes · {timeline.upcoming.length} match à venir
                {timeline.upcoming.length > 1 ? "s" : ""}
                {timeline.live.length > 0
                  ? ` · ${timeline.live.length} match${timeline.live.length > 1 ? "s" : ""} en cours`
                  : ""}
              </p>
```

- [ ] **Step 4: Render `LiveMatches` and the new `UpcomingMatches` prop**

In the `selected.data` block, replace the `UpcomingMatches` call and add `LiveMatches` between it and `RefereeCounts`:

```tsx
            <UpcomingMatches
              matches={timeline.upcoming}
              suggestionsByMatch={selected.data.suggestionsByMatch}
              teamNameById={teamNameById}
              suggestionLimit={settings.suggestedTeamCount}
            />
            <LiveMatches
              matches={timeline.live}
              teamNameById={teamNameById}
            />
            <RefereeCounts counts={selected.data.refereeCounts} />
```

- [ ] **Step 5: Build to verify it compiles**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 6: Lint**

Run: `pnpm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add webapp/src/App.tsx
git commit -m "feat: show live matches card and split upcoming counts by horizon"
```

---

### Task 6: Final verification

**Files:**
- None modified.

- [ ] **Step 1: Tests**

Run: `pnpm test`
Expected: PASS — the new `timeline.test.ts` cases and all existing tests.

- [ ] **Step 2: Lint**

Run: `pnpm run lint`
Expected: PASS.

- [ ] **Step 3: Build**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 4: Manual visual check**

Run: `pnpm dev` (port 3003). With a tournament that has non-finished matches:
- Header is a single row: title left, refresh centered, ⚙ right.
- Tournament picker sits below the header, not inside it.
- There is a visible gap between the "Voir sur Poloperator ↗" link and the subtitle.
- Upcoming match cards carry a `T+1` / `T+2` badge next to the time.
- When matches are in progress, a "Matchs en cours" card appears **below** "Matchs à venir" with score + assigned referee; it disappears when there are none.
- Subtitle reads e.g. "4 matchs à venir · 2 matchs en cours".