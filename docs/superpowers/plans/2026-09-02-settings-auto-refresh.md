# Settings, Auto-Refresh & Config Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter au webapp un bouton Rafraîchir auto-rempli sur 60 s, une modal de configuration (toggle tournoi en cours, nb d'équipes suggérées = 4, filtre continent = Europe) persistée en localStorage, et appliquer ces réglages à la liste des tournois et aux suggestions.

**Architecture:** Slice Redux classic `settings` (init depuis localStorage, gardé pour environnement node), contrôleur pur `startCountdown` pour le timer 60 s, composants `RefreshButton` et `SettingsModal`, fonction pure `filterTournaments`. Le parseur RSC lit le champ `continentCode` déjà présent dans les données.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux classic + Vitest (node env, pas de jsdom).

## Global Constraints

- Redux **classic** : `combineReducers` + RTK `configureStore` (thunks disabled). Pas de `createSlice`.
- Tout code, docs et tests en **anglais** sauf chaînes UI en français (libellés existants : « Rafraîchir », « Choisir un tournoi », …).
- Tests : `pnpm test` (Vitest 4.1, `vitest.config.ts`, environnement **node**, include `src/**/*.test.ts`). **Pas de jsdom ni de @testing-library/react.**
- `pnpm run build` = `tsc -b && vite build` (typecheck inclus).
- `pnpm run lint` = **oxlint**.
- Pas de nouvelle dépendance (aucun lifecycle script → pas de `pnpm approve-builds` nécessaire).
- Clé localStorage : `poloperator:settings:v1`.
- Tout appel localStorage **gardé** (try/catch, `typeof localStorage === 'undefined'`) pour fonctionner en node.

---

### Task 1: Continent type + parseur RSC

**Files:**
- Modify: `webapp/src/types/poloperator.ts`
- Modify: `webapp/src/services/poloperator/parseRsc.ts`
- Test: `webapp/src/services/poloperator/parseRsc.test.ts`

**Interfaces:**
- Consumes: `TournamentSummary` existant.
- Produces: `ContinentCode = 'EU' | 'NA' | 'SA' | 'AF' | 'AS' | 'OC'` (exporté depuis `types/poloperator.ts`), `isContinentCode(value: unknown): value is ContinentCode`, et `TournamentSummary.continentCode: ContinentCode | null`.

- [ ] **Step 1: Write the failing test**

Ajouter dans `parseRsc.test.ts` (dans le describe `extractTournaments (real payload)` existant, après le test « normalizes RSC dates ») :

```ts
it('extracts continentCode from tournament objects', () => {
  const montpellier = tournaments.find((t) =>
    t.slug.includes('montpellier-mixed-3-3'),
  )
  expect(montpellier?.continentCode).toBe('EU')
  const fresno = tournaments.find((t) => t.slug.includes('fresno'))
  expect(fresno?.continentCode).toBe('NA')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- parseRsc`
Expected: FAIL — `montpellier?.continentCode` est `undefined`, la propriété n'existe pas encore sur le type.

- [ ] **Step 3: Implement the type guard and parse**

Dans `webapp/src/types/poloperator.ts`, ajouter en tête de fichier :

```ts
export const CONTINENT_CODES = ['EU', 'NA', 'SA', 'AF', 'AS', 'OC'] as const

export type ContinentCode = (typeof CONTINENT_CODES)[number]

export function isContinentCode(value: unknown): value is ContinentCode {
  return (
    typeof value === 'string' &&
    (CONTINENT_CODES as readonly string[]).includes(value)
  )
}
```

Dans `TournamentSummary`, ajouter le champ :

```ts
continentCode: ContinentCode | null
```

Dans `webapp/src/services/poloperator/parseRsc.ts`, importer `isContinentCode` :

```ts
import type { Match, Team, TournamentSummary } from '../../types/poloperator'
import { isContinentCode } from '../../types/poloperator'
```

Et dans `normalizeTournament`, ajouter :

```ts
continentCode: isContinentCode(obj.continentCode) ? obj.continentCode : null,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- parseRsc`
Expected: PASS (tous les tests du fichier).

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm run build && pnpm run lint`
Expected: build OK, lint OK.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/types/poloperator.ts webapp/src/services/poloperator/parseRsc.ts webapp/src/services/poloperator/parseRsc.test.ts
git commit -m "feat: parse continentCode from RSC tournament data"
```

---

### Task 2: Settings slice (types, storage, actions, reducer)

**Files:**
- Create: `webapp/src/store/settings.ts`
- Create: `webapp/src/store/settingsStorage.ts`
- Create: `webapp/src/store/settingsActions.ts`
- Create: `webapp/src/store/settingsReducer.ts`
- Modify: `webapp/src/store/rootReducer.ts`
- Test: `webapp/src/store/settingsReducer.test.ts`

**Interfaces:**
- Consumes: `ContinentCode` et `isContinentCode` depuis `../../types/poloperator` (Task 1).
- Produces:
  - `store/settings.ts` : `Settings { showLiveOnly: boolean; suggestedTeamCount: number; continent: ContinentCode | 'ALL' }`, `DEFAULT_SETTINGS: Settings`, `CONTINENTS: ReadonlyArray<[ContinentCode, string]>`.
  - `store/settingsStorage.ts` : `loadSettings(): Settings`, `saveSettings(settings: Settings): void`.
  - `store/settingsActions.ts` : `SETTINGS_UPDATE = 'SETTINGS_UPDATE'`, `updateSettings(payload: Partial<Settings>)`.
  - `store/settingsReducer.ts` : `settingsReducer: Reducer<Settings>` (default export).
  - `rootReducer` monte la clé `settings`.

- [ ] **Step 1: Write the failing test**

Créer `webapp/src/store/settingsReducer.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import { SETTINGS_UPDATE, updateSettings } from './settingsActions'
import { settingsReducer } from './settingsReducer'

function makeStorage() {
  const data = new Map<string, string>()
  const storage = {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => {
      data.set(k, v)
    },
    removeItem: (k: string) => {
      data.delete(k)
    },
  }
  return storage as unknown as Storage
}

describe('settingsReducer', () => {
  beforeEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage
  })

  it('initializes with defaults when localStorage is unavailable', () => {
    const state = settingsReducer(undefined, { type: 'INIT' })
    expect(state).toEqual(DEFAULT_SETTINGS)
  })

  it('merges partial updates and persists', () => {
    const storage = makeStorage()
    Object.defineProperty(globalThis, 'localStorage', { value: storage })
    const state = settingsReducer(undefined, { type: 'INIT' })
    const next = settingsReducer(
      state,
      updateSettings({ continent: 'NA', suggestedTeamCount: 6 }),
    )
    expect(next).toEqual({ ...DEFAULT_SETTINGS, continent: 'NA', suggestedTeamCount: 6 })
    expect(storage.getItem('poloperator:settings:v1')).toBe(
      JSON.stringify(next),
    )
  })

  it('clamps suggestedTeamCount to [1, 8]', () => {
    const storage = makeStorage()
    Object.defineProperty(globalThis, 'localStorage', { value: storage })
    const state = settingsReducer(undefined, { type: 'INIT' })
    const next = settingsReducer(state, updateSettings({ suggestedTeamCount: 99 }))
    expect(next.suggestedTeamCount).toBe(8)
    const low = settingsReducer(state, updateSettings({ suggestedTeamCount: 0 }))
    expect(low.suggestedTeamCount).toBe(1)
  })

  it('returns DEFAULT_SETTINGS when stored JSON is corrupted', () => {
    const storage = makeStorage()
    storage.setItem('poloperator:settings:v1', '{not json')
    Object.defineProperty(globalThis, 'localStorage', { value: storage })
    const state = settingsReducer(undefined, { type: 'INIT' })
    expect(state).toEqual(DEFAULT_SETTINGS)
  })
})
```

Note : `settingsReducer` importe `loadSettings` au module load ; le test « corrupted » repose sur le fait que `initialState` par défaut du paramètre de fonction est évalué à chaque appel `settingsReducer(undefined, …)`. Vérifier que l'implémentation (Step 3) évalue `loadSettings()` **dans le paramètre par défaut**, pas au module load — sinon ce test échoue. Si le module load a déjà capturé l'absence de localStorage, utiliser `loadSettings()` explicitement (voir Step 3 pour l'implémentation retenue : paramètre par défaut).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- settingsReducer`
Expected: FAIL — module `./settings` introuvable (erreur d'import).

- [ ] **Step 3: Implement the settings module**

Créer `webapp/src/store/settings.ts` :

```ts
import type { ContinentCode } from '../types/poloperator'

export interface Settings {
  showLiveOnly: boolean
  suggestedTeamCount: number
  continent: ContinentCode | 'ALL'
}

export const DEFAULT_SETTINGS: Settings = {
  showLiveOnly: true,
  suggestedTeamCount: 4,
  continent: 'EU',
}

export const CONTINENTS: ReadonlyArray<[ContinentCode, string]> = [
  ['EU', 'Europe'],
  ['NA', 'Amérique du Nord'],
  ['SA', 'Amérique du Sud'],
  ['AF', 'Afrique'],
  ['AS', 'Asie'],
  ['OC', 'Océanie'],
]
```

Créer `webapp/src/store/settingsStorage.ts` :

```ts
import { isContinentCode } from '../types/poloperator'
import { DEFAULT_SETTINGS, type Settings } from './settings'

const STORAGE_KEY = 'poloperator:settings:v1'

function readStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function clampCount(value: number): number {
  return Math.min(8, Math.max(1, Math.round(value)))
}

function normalizeContinent(value: unknown): Settings['continent'] {
  if (value === 'ALL') return 'ALL'
  return isContinentCode(value) ? value : DEFAULT_SETTINGS.continent
}

export function loadSettings(): Settings {
  const storage = readStorage()
  if (!storage) return DEFAULT_SETTINGS
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      showLiveOnly:
        typeof parsed.showLiveOnly === 'boolean'
          ? parsed.showLiveOnly
          : DEFAULT_SETTINGS.showLiveOnly,
      suggestedTeamCount:
        typeof parsed.suggestedTeamCount === 'number' &&
        Number.isFinite(parsed.suggestedTeamCount)
          ? clampCount(parsed.suggestedTeamCount)
          : DEFAULT_SETTINGS.suggestedTeamCount,
      continent: normalizeContinent(parsed.continent),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  const storage = readStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Quota / security errors are ignored.
  }
}
```

Créer `webapp/src/store/settingsActions.ts` :

```ts
import type { Settings } from './settings'

export const SETTINGS_UPDATE = 'SETTINGS_UPDATE'

export interface SettingsUpdateAction {
  type: typeof SETTINGS_UPDATE
  payload: Partial<Settings>
}

export const updateSettings = (
  payload: Partial<Settings>,
): SettingsUpdateAction => ({
  type: SETTINGS_UPDATE,
  payload,
})
```

Créer `webapp/src/store/settingsReducer.ts` :

```ts
import type { AnyAction, Reducer } from 'redux'
import type { Settings } from './settings'
import { SETTINGS_UPDATE } from './settingsActions'
import { loadSettings, saveSettings } from './settingsStorage'

function clampCount(value: number): number {
  return Math.min(8, Math.max(1, Math.round(value)))
}

export const settingsReducer: Reducer<Settings> = (
  state: Settings = loadSettings(),
  action: AnyAction,
) => {
  switch (action.type) {
    case SETTINGS_UPDATE: {
      const partial = action.payload as Partial<Settings>
      const next: Settings = {
        ...state,
        ...partial,
        suggestedTeamCount:
          typeof partial.suggestedTeamCount === 'number'
            ? clampCount(partial.suggestedTeamCount)
            : state.suggestedTeamCount,
      }
      saveSettings(next)
      return next
    }
    default:
      return state
  }
}
```

Modifier `webapp/src/store/rootReducer.ts` :

```ts
import { combineReducers } from 'redux'

import { settingsReducer } from './settingsReducer'
import { tournamentReducer } from './tournamentReducer'
import { uiReducer } from './uiReducer'

export const rootReducer = combineReducers({
  ui: uiReducer,
  tournament: tournamentReducer,
  settings: settingsReducer,
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- settingsReducer`
Expected: PASS (4 it).

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm run build && pnpm run lint`
Expected: build OK, lint OK.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/store/settings.ts webapp/src/store/settingsStorage.ts webapp/src/store/settingsActions.ts webapp/src/store/settingsReducer.ts webapp/src/store/rootReducer.ts webapp/src/store/settingsReducer.test.ts
git commit -m "feat: add settings slice with localStorage persistence"
```

---

### Task 3: filterTournaments

**Files:**
- Create: `webapp/src/services/poloperator/filter.ts`
- Test: `webapp/src/services/poloperator/filter.test.ts`

**Interfaces:**
- Consumes: `Settings` depuis `../../store/settings`, `TournamentSummary` depuis `../../types/poloperator`.
- Produces: `filterTournaments(list: TournamentSummary[], settings: Settings): TournamentSummary[]`.

- [ ] **Step 1: Write the failing test**

Créer `webapp/src/services/poloperator/filter.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { TournamentSummary } from '../../types/poloperator'
import type { Settings } from '../../store/settings'
import { filterTournaments } from './filter'

function makeTournament(partial: Partial<TournamentSummary>): TournamentSummary {
  return {
    id: 't1',
    slug: 't1',
    name: 'Tournament',
    country: null,
    city: null,
    dateStart: null,
    dateEnd: null,
    format: null,
    status: 'LIVE',
    maxTeams: null,
    teamCount: null,
    continentCode: 'EU',
    ...partial,
  }
}

const baseSettings: Settings = {
  showLiveOnly: true,
  suggestedTeamCount: 4,
  continent: 'EU',
}

const liveEu = makeTournament({ id: 'a', slug: 'a', status: 'LIVE', continentCode: 'EU' })
const liveNa = makeTournament({ id: 'b', slug: 'b', status: 'LIVE', continentCode: 'NA' })
const finishedEu = makeTournament({ id: 'c', slug: 'c', status: 'COMPLETED', continentCode: 'EU' })
const futureEu = makeTournament({ id: 'd', slug: 'd', status: 'UPCOMING', continentCode: 'EU' })

describe('filterTournaments', () => {
  it('filters by continent (default Europe)', () => {
    expect(filterTournaments([liveEu, liveNa], baseSettings)).toEqual([liveEu])
  })

  it('keeps all continents when continent is ALL', () => {
    const all = { ...baseSettings, continent: 'ALL' as const }
    expect(filterTournaments([liveEu, liveNa], all)).toEqual([liveEu, liveNa])
  })

  it('keeps only LIVE tournaments when showLiveOnly is true', () => {
    expect(filterTournaments([liveEu, finishedEu, futureEu], baseSettings)).toEqual([liveEu])
  })

  it('keeps all statuses when showLiveOnly is false', () => {
    const off = { ...baseSettings, showLiveOnly: false }
    expect(filterTournaments([liveEu, finishedEu], off)).toEqual([liveEu, finishedEu])
  })

  it('keeps the input order', () => {
    const list = [finishedEu, liveNa, liveEu]
    const out = filterTournaments(list, { ...baseSettings, showLiveOnly: false, continent: 'ALL' })
    expect(out.map((t) => t.id)).toEqual(['c', 'b', 'a'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- filter.test`
Expected: FAIL — module `./filter` introuvable.

- [ ] **Step 3: Implement the filter**

Créer `webapp/src/services/poloperator/filter.ts` :

```ts
import type { Settings } from '../../store/settings'
import type { TournamentSummary } from '../../types/poloperator'

export function filterTournaments(
  list: TournamentSummary[],
  settings: Settings,
): TournamentSummary[] {
  return list.filter(
    (t) =>
      (settings.continent === 'ALL' ||
        t.continentCode === settings.continent) &&
      (!settings.showLiveOnly || t.status === 'LIVE'),
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- filter.test`
Expected: PASS (5 it).

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm run build && pnpm run lint`
Expected: build OK, lint OK.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/services/poloperator/filter.ts webapp/src/services/poloperator/filter.test.ts
git commit -m "feat: add tournament list filtering by continent and live status"
```

---

### Task 4: startCountdown controller

**Files:**
- Create: `webapp/src/utils/countdown.ts`
- Test: `webapp/src/utils/countdown.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `startCountdown(options: { durationMs: number; intervalMs: number; onTick: (remainingMs: number) => void; onComplete: () => void }): () => void` — retourne `stop()`. Le compte à rebours **auto-relance** après `onComplete` (auto-refresh) ; `stop()` arrête définitivement.

- [ ] **Step 1: Write the failing test**

Créer `webapp/src/utils/countdown.test.ts` :

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startCountdown } from './countdown'

describe('startCountdown', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ticks down from durationMs in intervalMs steps', () => {
    vi.useFakeTimers()
    const ticks: number[] = []
    startCountdown({
      durationMs: 60_000,
      intervalMs: 250,
      onTick: (r) => ticks.push(r),
      onComplete: () => {},
    })
    vi.advanceTimersByTime(250)
    expect(ticks).toEqual([60_000, 59_750])
  })

  it('fires onComplete at 0 and auto-restarts', () => {
    vi.useFakeTimers()
    const ticks: number[] = []
    let completions = 0
    startCountdown({
      durationMs: 1_000,
      intervalMs: 250,
      onTick: (r) => ticks.push(r),
      onComplete: () => {
        completions += 1
      },
    })
    vi.advanceTimersByTime(2_000)
    expect(completions).toBe(2)
    expect(ticks[0]).toBe(1_000)
    expect(ticks[ticks.length - 1]).toBe(1_000)
  })

  it('stop() halts the countdown', () => {
    vi.useFakeTimers()
    const ticks: number[] = []
    const stop = startCountdown({
      durationMs: 1_000,
      intervalMs: 250,
      onTick: (r) => ticks.push(r),
      onComplete: () => {},
    })
    vi.advanceTimersByTime(500)
    stop()
    const count = ticks.length
    vi.advanceTimersByTime(1_000)
    expect(ticks.length).toBe(count)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- countdown`
Expected: FAIL — module `./countdown` introuvable.

- [ ] **Step 3: Implement the controller**

Créer `webapp/src/utils/countdown.ts` :

```ts
export interface CountdownOptions {
  durationMs: number
  intervalMs: number
  onTick: (remainingMs: number) => void
  onComplete: () => void
}

export function startCountdown({
  durationMs,
  intervalMs,
  onTick,
  onComplete,
}: CountdownOptions): () => void {
  let remainingMs = durationMs
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null

  onTick(remainingMs)

  const tick = () => {
    if (stopped) return
    remainingMs -= intervalMs
    if (remainingMs <= 0) {
      onTick(0)
      onComplete()
      remainingMs = durationMs
      onTick(remainingMs)
    } else {
      onTick(remainingMs)
    }
    timer = setTimeout(tick, intervalMs)
  }

  timer = setTimeout(tick, intervalMs)

  return () => {
    stopped = true
    if (timer !== null) clearTimeout(timer)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- countdown`
Expected: PASS (3 it).

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm run build && pnpm run lint`
Expected: build OK, lint OK.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/utils/countdown.ts webapp/src/utils/countdown.test.ts
git commit -m "feat: add auto-restarting countdown controller"
```

---

### Task 5: RefreshButton component

**Files:**
- Create: `webapp/src/components/RefreshButton.tsx`

**Interfaces:**
- Consumes: `startCountdown` depuis `../utils/countdown` (Task 4).
- Produces: `RefreshButton({ loading: boolean; onRefresh: () => void; intervalMs?: number })` (défaut `intervalMs = 60_000`). Pas de test node (rendu React non testable sans jsdom) — vérifié par build/lint et usage dans App (Task 8).

- [ ] **Step 1: Implement the component**

Créer `webapp/src/components/RefreshButton.tsx` :

```tsx
import { useEffect, useRef, useState } from 'react'
import { startCountdown } from '../utils/countdown'

interface RefreshButtonProps {
  loading: boolean
  onRefresh: () => void
  intervalMs?: number
}

const TICK_MS = 250

export function RefreshButton({
  loading,
  onRefresh,
  intervalMs = 60_000,
}: RefreshButtonProps) {
  const [remainingMs, setRemainingMs] = useState(intervalMs)
  const stopRef = useRef<(() => void) | null>(null)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  const start = () => {
    stopRef.current?.()
    setRemainingMs(intervalMs)
    stopRef.current = startCountdown({
      durationMs: intervalMs,
      intervalMs: TICK_MS,
      onTick: setRemainingMs,
      onComplete: () => onRefreshRef.current(),
    })
  }

  useEffect(() => {
    start()
    return () => stopRef.current?.()
  }, [intervalMs])

  const progress = 1 - remainingMs / intervalMs
  const seconds = Math.ceil(remainingMs / 1000)

  const handleClick = () => {
    if (loading) return
    onRefreshRef.current()
    start()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="relative overflow-hidden rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-teal-500 hover:text-teal-400 disabled:opacity-60"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-teal-500/25"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative">
        {loading ? 'Rafraîchir…' : `Rafraîchir · ${seconds}s`}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm run build && pnpm run lint`
Expected: build OK, lint OK.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/RefreshButton.tsx
git commit -m "feat: add 60s auto-refresh button with progress bar"
```

---

### Task 6: SettingsModal component

**Files:**
- Create: `webapp/src/components/SettingsModal.tsx`

**Interfaces:**
- Consumes: `Settings`, `CONTINENTS` depuis `../store/settings`, `useAppDispatch` depuis `../hooks`, `updateSettings` depuis `../store/settingsActions` (Task 2).
- Produces: `SettingsModal({ open: boolean; onClose: () => void; settings: Settings })`.

- [ ] **Step 1: Implement the component**

Créer `webapp/src/components/SettingsModal.tsx` :

```tsx
import { useEffect } from 'react'
import { useAppDispatch } from '../hooks'
import { CONTINENTS, type Settings } from '../store/settings'
import { updateSettings } from '../store/settingsActions'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  settings: Settings
}

const MAX_TEAMS = 8
const MIN_TEAMS = 1

export function SettingsModal({ open, onClose, settings }: SettingsModalProps) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Configuration"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-semibold text-neutral-100">
          Configuration
        </h2>

        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-200">
            Afficher tournoi en cours
          </span>
          <input
            type="checkbox"
            checked={settings.showLiveOnly}
            onChange={(e) =>
              dispatch(updateSettings({ showLiveOnly: e.target.checked }))
            }
            className="h-4 w-4 accent-teal-500"
          />
        </label>

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-200">
            Nombre d'équipes suggérées
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Diminuer"
              onClick={() =>
                dispatch(
                  updateSettings({
                    suggestedTeamCount: Math.max(
                      MIN_TEAMS,
                      settings.suggestedTeamCount - 1,
                    ),
                  }),
                )
              }
              className="h-8 w-8 rounded border border-neutral-700 text-neutral-300 hover:border-teal-500 hover:text-teal-400"
            >
              −
            </button>
            <span className="w-8 text-center text-sm text-neutral-100">
              {settings.suggestedTeamCount}
            </span>
            <button
              type="button"
              aria-label="Augmenter"
              onClick={() =>
                dispatch(
                  updateSettings({
                    suggestedTeamCount: Math.min(
                      MAX_TEAMS,
                      settings.suggestedTeamCount + 1,
                    ),
                  }),
                )
              }
              className="h-8 w-8 rounded border border-neutral-700 text-neutral-300 hover:border-teal-500 hover:text-teal-400"
            >
              +
            </button>
          </div>
        </div>

        <label className="mt-5 block text-sm text-neutral-200">
          Continent
          <select
            value={settings.continent}
            onChange={(e) =>
              dispatch(
                updateSettings({
                  continent: e.target.value as Settings['continent'],
                }),
              )
            }
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-teal-500"
          >
            <option value="ALL">Tous les continents</option>
            {CONTINENTS.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-teal-500 hover:text-teal-400"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm run build && pnpm run lint`
Expected: build OK, lint OK.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/SettingsModal.tsx
git commit -m "feat: add settings modal with live-updating controls"
```

---

### Task 7: UpcomingMatches suggestionLimit

**Files:**
- Modify: `webapp/src/components/UpcomingMatches.tsx`

**Interfaces:**
- Consumes: `RefereeSuggestion` depuis `../types/poloperator` (existant).
- Produces: prop `suggestionLimit: number` sur `UpcomingMatches` ; les suggestions affichées passent de `.slice(0, 3)` à `.slice(0, suggestionLimit)`.

- [ ] **Step 1: Implement the change**

Modifier `webapp/src/components/UpcomingMatches.tsx` :

```tsx
interface UpcomingMatchesProps {
  matches: Match[]
  suggestionsByMatch: Record<string, RefereeSuggestion[]>
  teamNameById: (teamId: string | null) => string
  suggestionLimit: number
}
```

Dans le corps du composant, remplacer :

```tsx
{(suggestionsByMatch[match.id] ?? []).slice(0, 3).map((s, i) => (
```

par :

```tsx
{(suggestionsByMatch[match.id] ?? []).slice(0, suggestionLimit).map((s, i) => (
```

Et désructurer `suggestionLimit` dans la signature du composant :

```tsx
export function UpcomingMatches({
  matches,
  suggestionsByMatch,
  teamNameById,
  suggestionLimit,
}: UpcomingMatchesProps) {
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm run build && pnpm run lint`
Expected: build OK, lint OK. (App.tsx passe encore `UpcomingMatches` sans la nouvelle prop → tsc va le signaler ; corriger dans Task 8.)

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/UpcomingMatches.tsx
git commit -m "feat: make suggested team count configurable via prop"
```

Note : le commit intermédiaire peut laisser `tsc` rouge tant que App.tsx n'est pas branché (Task 8). Si le build échoue à l'étape 2, passer directement à la Task 8 avant de considérer le typecheck vert.

---

### Task 8: App wiring — filtres, RefreshButton, modal, suggestionLimit

**Files:**
- Modify: `webapp/src/App.tsx`
- Modify: `webapp/src/components/TournamentPicker.tsx`

**Interfaces:**
- Consumes : `settings` depuis `useAppSelector((s) => s.settings)` (Task 2), `filterTournaments` (Task 3), `RefreshButton` (Task 5), `SettingsModal` (Task 6), `suggestionLimit` (Task 7).
- Produces : App câblée — filtres appliqués au sélecteur, bouton refresh auto dans le header, roue crantée ⚙ ouvrant la modal, `suggestionLimit` transmis à `UpcomingMatches`.

- [ ] **Step 1: Remove the refresh button from TournamentPicker**

Modifier `webapp/src/components/TournamentPicker.tsx` :
- Retirer `onRefresh` de `TournamentPickerProps`.
- Retirer le bouton « Rafraîchir » (bloc `<button … onClick={onRefresh}…>`).
- Ajouter, après le `<select>`, un message quand la liste est vide (filtrée) et non chargée :

```tsx
{tournaments !== null && tournaments.length === 0 ? (
  <p className="text-xs text-neutral-500">
    Aucun tournoi ne correspond aux filtres.
  </p>
) : null}
```

- [ ] **Step 2: Wire App.tsx**

Modifier `webapp/src/App.tsx` :

1. Imports :

```tsx
import { useEffect, useMemo, useState } from 'react'
import { RefreshButton } from './components/RefreshButton'
import { SettingsModal } from './components/SettingsModal'
import { filterTournaments } from './services/poloperator/filter'
```

2. State & sélecteurs (dans `App()`, après les sélecteurs existants) :

```tsx
const settings = useAppSelector((s) => s.settings)
const [settingsOpen, setSettingsOpen] = useState(false)

const filteredList = useMemo(
  () => (list ? filterTournaments(list, settings) : null),
  [list, settings],
)
```

3. Header — remplacer le bloc `<TournamentPicker … />` par :

```tsx
<div className="flex flex-wrap items-center gap-3">
  <TournamentPicker
    tournaments={filteredList}
    loading={listLoading}
    selectedSlug={summary?.slug ?? null}
    onSelect={(t) =>
      dispatch(loadTournamentRequested({ slug: t.slug, summary: t }))
    }
  />
  <RefreshButton loading={listLoading || selected.loading} onRefresh={handleRefresh} />
  <button
    type="button"
    onClick={() => setSettingsOpen(true)}
    aria-label="Configuration"
    className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-teal-500 hover:text-teal-400"
  >
    ⚙
  </button>
</div>
```

4. Passer `suggestionLimit` à `UpcomingMatches` :

```tsx
<UpcomingMatches
  matches={selected.data.upcomingMatches}
  suggestionsByMatch={selected.data.suggestionsByMatch}
  teamNameById={teamNameById}
  suggestionLimit={settings.suggestedTeamCount}
/>
```

5. Rendre la modal en fin de JSX (après `</div>` du conteneur max-w, dans `<main>`) :

```tsx
<SettingsModal
  open={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  settings={settings}
/>
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm run build && pnpm run lint`
Expected: build OK, lint OK.

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`
Expected: PASS (tous les tests, anciens + nouveaux).

- [ ] **Step 5: Manual smoke check (dev)**

Run: `pnpm dev` (port 3003). Vérifier :
1. La barre du bouton « Rafraîchir » se remplit sur 60 s, puis le refresh se déclenche et repart à 0.
2. Un clic déclenche un refresh immédiat et réinitialise la barre.
3. La modal ⚙ s'ouvre, le toggle « Afficher tournoi en cours » est coché, « 4 » équipes, « Europe » sélectionné.
4. Désactiver « Afficher tournoi en cours » → les tournois COMPLETED/UPCOMING réapparaissent dans le menu.
5. Changer le continent → la liste se filtre ; « Tous les continents » désactive le filtre.
6. Recharger la page → les réglages persistent (localStorage).

- [ ] **Step 6: Commit**

```bash
git add webapp/src/App.tsx webapp/src/components/TournamentPicker.tsx
git commit -m "feat: apply settings filters, auto-refresh and config modal in app"
```

---

## Self-Review Notes

- Spec → plan : chaque section du spec a sa tâche — types/parse (Task 1), slice réglages (Task 2), filtrage (Task 3), timer (Task 4), RefreshButton (Task 5), SettingsModal (Task 6), suggestionLimit (Task 7), câblage App + cas limites (Task 8).
- Pas de placeholder : tous les steps contiennent le code complet.
- Cohérence des signatures : `updateSettings(Partial<Settings>)`, `filterTournaments(list, settings)`, `startCountdown(options)`, props `RefreshButton`/`SettingsModal`/`UpcomingMatches` identiques entre tâches.
- `RootState` (store.ts) inclut `settings` automatiquement via `combineReducers`.