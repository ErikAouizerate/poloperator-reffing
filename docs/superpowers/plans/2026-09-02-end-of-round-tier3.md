# End-of-round referee rule & player names — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rank tier-3 referee suggestions by the candidate's most recent played slot (played at t−2 first), and show roster player names under the team name in the referee-counts table.

**Architecture:** Pure engine change in `services/prediction/index.ts` (a new past-based `lastPlayedSlot` map mirrors the existing future-based `nextMatchSlot`, and the suggestion comparator gains a rest group key applied only between tier-3 candidates). `parseRsc` starts extracting roster player names into `Team.playerNames`, which flow into `RefereeCountEntry` and are rendered by `RefereeCounts.tsx`.

**Tech Stack:** TypeScript, React 19, classic Redux, Tailwind CSS v4. Tests: Vitest 4.1 (node env). Lint: oxlint. Typecheck is part of `pnpm run build` (`tsc -b && vite build`).

## Global Constraints

- Redux is classic (`combineReducers`), no `createSlice`. Not relevant here (pure functions + component only).
- TypeScript by default; no plain JS (the temporary inspection script `inspect-roster.mjs` is a scratch tool, deleted after use).
- Communication with the user is French; code, docs, and tests are English.
- Keep `pnpm-lock.yaml` in sync; no new dependencies in this plan.
- Run from `webapp/`: `pnpm test`, `pnpm run lint`, `pnpm run build`.

---

### Task 1: Types

**Files:**
- Modify: `webapp/src/types/poloperator.ts`

**Interfaces:**
- Consumes: nothing (defines the shared shapes).
- Produces:
  - `Team` gains `playerNames: string[]`
  - `RefereeSuggestion` gains `lastPlayedSlotIndex: number | null`
  - `RefereeCountEntry` gains `playerNames: string[]`

- [ ] **Step 1: Edit the type declarations**

In `Team`, after `playerIds`, add `playerNames: string[]`. In `RefereeSuggestion`, after `nextMatchSlotIndex`, add `lastPlayedSlotIndex: number | null`. In `RefereeCountEntry`, after `teamName`, add `playerNames: string[]`.

- [ ] **Step 2: Typecheck**

Run: `pnpm run build` from `webapp/`
Expected: PASS (this only widens types; existing object literals compile because the new fields are added in later tasks — until then `Team`/`RefereeSuggestion`/`RefereeCountEntry` constructions that omit them will fail, so run Task 2/3/4 before asserting a clean build).

- [ ] **Step 3: Commit**

```bash
git add webapp/src/types/poloperator.ts
git commit -m "feat: add player names and last-played-slot to domain types"
```

---

### Task 2: Engine — tier 3 ordered by last played slot (TDD)

**Files:**
- Modify: `webapp/src/services/prediction/index.ts`
- Test: `webapp/src/services/prediction/prediction.test.ts`
- Verify: `webapp/src/services/prediction/validate-replay.test.ts`

**Interfaces:**
- Consumes: `RefereeSuggestion.lastPlayedSlotIndex` (Task 1).
- Produces: `suggestForSlot(model, targetSlotIndex, options?)` — same signature; candidates' `lastPlayedSlotIndex` now filled and used to order tier-3 candidates.

- [ ] **Step 1: Write the failing synthetic test (end of round)**

Add a new `describe('suggestForSlot (end of round, no future matches)', ...)` in `prediction.test.ts`:

```ts
describe('suggestForSlot (end of round, future unknown)', () => {
  const teams: Team[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((name) => ({
    id: name,
    name,
    playerIds: [`${name}-p1`, `${name}-p2`],
    playerNames: [`Player ${name}`],
  }))

  const matches: Match[] = [
    m(0, 's0', 'A', 'B', null),
    m(1, 's1', 'C', 'D', null),
    m(2, 's2', 'E', 'F', null),
    m(3, 's3', 'G', 'H', null), // target: no matches after this slot
  ]

  function m(slot: number, id: string, a: string, b: string, refOf: string | null): Match {
    return {
      id,
      startAt: `2026-09-02T0${slot}:00:00.000Z`,
      courtName: 'Court 1',
      status: slot === 3 ? 'SCHEDULED' : 'FINISHED',
      phase: 'STAGE',
      teamAId: a,
      teamBId: b,
      scoreA: null,
      scoreB: null,
      refereePlayerId: refOf ? `${refOf}-p1` : null,
      refereeName: refOf ? `ref-of-${refOf}` : null,
    }
  }

  const slots = buildSlots(matches)
  const model = buildModel(teams, slots)

  it('ranks teams that played at t−2 first, then older, then t−1 (all tier 3)', () => {
    const { suggestionsByMatch } = suggestForSlot(model, 3)
    const list = suggestionsByMatch.get('s3')!
    expect(list.every((s) => s.tier === 3)).toBe(true)
    // played at t−2 (slot 1): C, D first (no referee duties → both 0)
    expect(list[0].teamId).toBe('C')
    expect(list[1].teamId).toBe('D')
    // played at t−3 or earlier (slot 0): A, B
    expect(list[2].teamId).toBe('A')
    expect(list[3].teamId).toBe('B')
    // played at t−1 (slot 2): E, F last
    expect(list[4].teamId).toBe('E')
    expect(list[5].teamId).toBe('F')
  })

  it('breaks ties within the t−2 group by fewest referee duties', () => {
    // give D one recorded referee duty
    const refs = matches.map((x) =>
      x.id === 's2' ? { ...x, refereePlayerId: 'D-p1', refereeName: 'ref-D' } : x,
    )
    const model2 = buildModel(teams, buildSlots(refs))
    const { suggestionsByMatch } = suggestForSlot(model2, 3)
    const list = suggestionsByMatch.get('s3')!
    expect(list[0].teamId).toBe('C') // count 0
    expect(list[1].teamId).toBe('D') // count 1, same t−2 group
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test prediction`
Expected: FAIL — `list[0].teamId` is not `C` (no last-played ordering yet; order falls back to count/name).

- [ ] **Step 3: Add the `lastPlayedSlot` helper and wire it into scoring**

In `webapp/src/services/prediction/index.ts`, add a helper mirroring `nextMatchSlot`:

```ts
/** Most recent slot index < target where each team played. */
function lastPlayedSlot(
  model: TournamentModel,
  targetSlotIndex: number,
): Map<string, number> {
  const last = new Map<string, number>()
  for (const slot of model.slots) {
    if (slot.index >= targetSlotIndex) continue
    for (const match of slot.matches) {
      if (!match.teamAId || !match.teamBId) continue
      if (match.teamAId) last.set(match.teamAId, slot.index)
      if (match.teamBId) last.set(match.teamBId, slot.index)
    }
  }
  return last
}
```

In `suggestForSlot`, after `const next = nextMatchSlot(model, targetSlotIndex)`, add `const last = lastPlayedSlot(model, targetSlotIndex)`. In the candidate scoring object, add `lastPlayedSlotIndex: last.get(team.id) ?? null`.

- [ ] **Step 4: Rest-group comparator**

Replace `compareSuggestions` with a version that takes the target slot and applies a rest group **only between tier-3 candidates**:

```ts
function restGroup(lastPlayed: number | null, targetSlotIndex: number): number {
  if (lastPlayed === targetSlotIndex - 2) return 0 // due now, keeps rest
  if (lastPlayed === targetSlotIndex - 1) return 2 // just played, no rest
  return 1 // played earlier (or never)
}

function compareSuggestions(
  a: RefereeSuggestion,
  b: RefereeSuggestion,
  targetSlotIndex: number,
): number {
  if (a.tier !== b.tier) return a.tier - b.tier
  if (a.tier === 3) {
    const ga = restGroup(a.lastPlayedSlotIndex, targetSlotIndex)
    const gb = restGroup(b.lastPlayedSlotIndex, targetSlotIndex)
    if (ga !== gb) return ga - gb
  }
  if (a.refereeCount !== b.refereeCount) return a.refereeCount - b.refereeCount
  const aLast = a.lastRefSlotIndex ?? -1
  const bLast = b.lastRefSlotIndex ?? -1
  if (aLast !== bLast) return aLast - bLast
  return a.teamName.localeCompare(b.teamName)
}
```

Update the call site to `scored.sort((x, y) => compareSuggestions(x, y, targetSlotIndex))`. Update the module doc header (lines 10–17) to describe the new tier-3 rule:

```ts
/**
 * Referee prediction engine.
 *
 * Rule (balanced duty rotation, slot granularity — a slot = a wave of matches
 * running in parallel): a team that plays at slot T referees two slots before,
 * at T-2, and rests at T-1. When several teams are eligible, prefer the ones
 * with the fewest referee duties so counts stay balanced.
 *
 * Tiers 1-2 are based on the candidate's next known match (T+2 / [T+1, T+3]).
 * Tier 3 covers candidates with no known next match (end of a Swiss round, end
 * of the day, eliminated teams). Within tier 3, prefer the teams whose most
 * recent match was at T-2 (they are due to referee and keep a rest slot), then
 * teams that played earlier, and last the teams that just played at T-1.
 */
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test`
Expected: PASS for the new tests. Then check the pre-existing invariant test `'sorts by tier then referee count'` — if it now fails because tier-3 candidates span multiple rest groups, update it to assert monotone ordering on `(tier, restGroup, refereeCount)` instead of `(tier, refereeCount)`. Also run `pnpm test validate-replay` and confirm `max−min ≤ 3` still holds (tier 3 now prefers t−2 but count remains the secondary key); if it degrades slightly, re-run and record the actual spread and adjust the bound with justification in a comment.

- [ ] **Step 6: Lint & build**

Run: `pnpm run lint && pnpm run build` from `webapp/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add webapp/src/services/prediction
git commit -m "feat: rank tier-3 refs by last played slot (t-2 first)"
```

---

### Task 3: Parser — extract roster player names (TDD)

**Files:**
- Modify: `webapp/src/services/poloperator/parseRsc.ts`
- Test: `webapp/src/services/poloperator/parseRsc.test.ts`
- Create (temporary, delete after): `webapp/scripts/inspect-roster.mjs`

**Interfaces:**
- Consumes: `Team.playerNames` (Task 1).
- Produces: `extractTournamentRosters(values)` returns teams whose `playerNames` are filled from the RSC payload.

- [ ] **Step 1: Discover the roster entry shape**

Create `webapp/scripts/inspect-roster.mjs`:

```js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const text = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/services/poloperator/__fixtures__/montpellier.rsc.json'),
  'utf8',
)
const values = text.split('\n')
  .filter(Boolean)
  .map((line) => {
    const i = line.indexOf(':')
    if (i < 0) return null
    try { return JSON.parse(line.slice(i + 1)) } catch { return null }
  })
  .filter(Boolean)

function walk(node, fn) {
  if (Array.isArray(node)) { node.forEach((x) => walk(x, fn)); return }
  if (node && typeof node === 'object') { fn(node); Object.values(node).forEach((x) => walk(x, fn)) }
}

const seen = new Set()
walk(values, (obj) => {
  if (typeof obj.id === 'string' && typeof obj.name === 'string' && Array.isArray(obj.players)) {
    const key = obj.id
    if (seen.has(key)) return
    seen.add(key)
    const entry = obj.players[0]
    console.log('TEAM', obj.name, 'entry keys=', Object.keys(entry ?? {}), 'entry=', JSON.stringify(entry))
  }
})
```

Run: `node webapp/scripts/inspect-roster.mjs`
Record the keys of a roster entry. Expected: the entry carries the player name either as `entry.name` directly, or nested (e.g. `entry.player.name`). Use whatever field actually holds the display name in Step 2.

- [ ] **Step 2: Write the failing test (real payload)**

In `parseRsc.test.ts`, inside the existing `describe('extractTournamentRosters (real payload)')` add:

```ts
it('extracts roster player names', () => {
  for (const team of teams) expect(team.playerNames.length).toBeGreaterThan(0)
  const rapt = teams.find((t) => t.name === 'RAPTUS')
  expect(rapt!.playerNames).toHaveLength(4)
  const paranoia = teams.find((t) => t.name === 'Paranoïd')
  expect(paranoia!.playerNames.some((n) => n.includes('Manu'))).toBe(true)
})
```

(Adjust the Paranoïd assertion to the name actually seen in Step 1 — the exact string depends on the payload field; "Manu (ntods)" is the referee display name.)

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test parseRsc`
Expected: FAIL — `playerNames` is undefined.

- [ ] **Step 4: Implement name extraction in `normalizeTeam`**

In `parseRsc.ts`, extend `normalizeTeam` to fill `playerNames` alongside `playerIds`. For each roster entry, take the name from the field discovered in Step 1 (default `entry.name`), keep it only if it is a non-empty string, and keep `playerIds`/`playerNames` index-aligned:

```ts
function normalizeTeam(obj: RawObject): Team {
  const playerIds: string[] = []
  const playerNames: string[] = []
  for (const entry of obj.players as unknown[]) {
    if (!isRecord(entry)) continue
    if (typeof entry.playerId === 'string') playerIds.push(entry.playerId)
    else if (typeof entry.id === 'string') playerIds.push(entry.id)
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    playerNames.push(name)
  }
  return { id: String(obj.id), name: String(obj.name).trim(), playerIds, playerNames }
}
```

If Step 1 shows the name is nested (not on `entry.name`), adjust the `name` line to read the actual field. Add a comment explaining the source field.

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test parseRsc`
Expected: PASS.

- [ ] **Step 6: Delete the scratch script**

```bash
rm webapp/scripts/inspect-roster.mjs
```

- [ ] **Step 7: Lint, build, commit**

Run: `pnpm run lint && pnpm run build`
Expected: PASS.

```bash
git add webapp/src/services/poloperator
git commit -m "feat: parse roster player names"
```

---

### Task 4: UI — show players under the team name

**Files:**
- Modify: `webapp/src/components/RefereeCounts.tsx`
- Modify: `webapp/src/services/prediction/index.ts` (fill `playerNames` in `refereeCounts`)

**Interfaces:**
- Consumes: `RefereeCountEntry.playerNames` (Task 1).
- Produces: `refereeCounts(model)` returns entries with `playerNames` populated from the team model.

- [ ] **Step 1: Populate `playerNames` in `refereeCounts`**

In `webapp/src/services/prediction/index.ts`, in the `refereeCounts` map step, add `playerNames: team?.playerNames ?? []` to the returned entry.

- [ ] **Step 2: Render players under the team name**

In `RefereeCounts.tsx`, change the fixed-width name cell into a two-line block. Replace the single `<span className="w-40 truncate ...">{entry.teamName}</span>` with:

```tsx
<div className="w-44 min-w-0">
  <p className="truncate text-sm font-medium text-ink">{entry.teamName}</p>
  {entry.playerNames.length > 0 ? (
    <p className="truncate text-xs text-muted" title={entry.playerNames.join(' · ')}>
      {entry.playerNames.join(' · ')}
    </p>
  ) : null}
</div>
```

Keep the bar and the count cell unchanged; the `li` remains `flex items-center gap-3`.

- [ ] **Step 3: Build & lint**

Run: `pnpm run lint && pnpm run build` from `webapp/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/RefereeCounts.tsx webapp/src/services/prediction/index.ts
git commit -m "feat: show roster players under team name in referee counts"
```

---

### Task 5: Docs & final validation

**Files:**
- Modify: `webapp/src/services/prediction/index.ts` (already updated header in Task 2 — verify)
- Modify: `docs/superpowers/specs/2026-09-01-poloperator-reffing-design.md`

- [ ] **Step 1: Update the 2026-09-01 design doc**

In the "Referee rule" section, after the tier 2 line, replace the tier 3 line with:

```
3. **Tier 3** — any team not playing the slot (no known next match): first
   teams whose most recent match was at T−2 (duty rotation with rest), then
   teams that played earlier, then teams that just played at T−1. Within each
   group, fewest duties first, then longest without refereeing.
```

Add a short line to the architecture list noting roster player names are
extracted and shown under the team name in the counts table.

- [ ] **Step 2: Full suite**

Run from `webapp/`: `pnpm test && pnpm run lint && pnpm run build`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add docs webapp/src/services/prediction/index.ts
git commit -m "docs: document end-of-round tier-3 rule and roster player names"
```
