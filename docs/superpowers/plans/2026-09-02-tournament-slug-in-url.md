# Tournament Slug in URL — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre le slug du tournoi sélectionné dans l'URL (`?tournament=<slug>`) pour partager facilement, avec auto-chargement depuis l'URL et bascule « filtres désactivés » quand le tournoi de l'URL est masqué par les filtres.

**Architecture:** Pas de routeur. Helpers URL purs (`parseSlugFromSearch` / `buildSearchWithSlug`) + wrapper navigateur gardé `syncTournamentSlug` (pattern `settingsStorage`). Nouvelle fonction pure `resolvePickerList` qui retombe sur la liste complète si le tournoi sélectionné est absent de la liste filtrée. `App.tsx` lit le slug une fois, auto-charge le tournoi à la fin du chargement de la liste, et écrit le slug dans l'URL via `history.replaceState` à chaque sélection.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind CSS v4 + Redux classic + Vitest (node env, pas de jsdom).

## Global Constraints

- Redux **classic** : `combineReducers` + RTK `configureStore` (thunks disabled). Pas de `createSlice`.
- Code, docs et tests en **anglais** ; chaînes UI en français (libellés existants inchangés).
- Tests : `pnpm test` (Vitest 4.1, `vitest.config.ts`, environnement **node**, include `src/**/*.test.ts`). **Pas de jsdom ni de @testing-library/react.**
- `pnpm run build` = `tsc -b && vite build` (typecheck inclus). `pnpm run lint` = **oxlint**.
- **Aucune nouvelle dépendance** (rien à `pnpm approve-builds`).
- Tout accès navigateur (`window`, `history`) **gardé** (try/catch, `typeof … === 'undefined'`) pour fonctionner en node.
- Paramètre URL : `tournament` ; valeur = `slug` du tournoi. Sync via `history.replaceState`.
- Ne pas modifier `index.html`, `main.tsx`, `vite.config.ts`, `vitest.config.ts`.

---

### Task 1: Helpers URL purs + wrapper navigateur

**Files:**
- Create: `webapp/src/utils/urlTournament.ts`
- Create: `webapp/src/utils/urlTournament.test.ts`

**Interfaces:**
- Consumes: rien (module autonome).
- Produces: `TOURNAMENT_URL_PARAM: string`, `parseSlugFromSearch(search: string): string | null`, `buildSearchWithSlug(search: string, slug: string | null): string`, `syncTournamentSlug(slug: string | null): void`. Utilisés par App (Task 3).

- [ ] **Step 1: Write the failing test**

Créer `webapp/src/utils/urlTournament.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { buildSearchWithSlug, parseSlugFromSearch } from './urlTournament'

describe('parseSlugFromSearch', () => {
  it('returns null when the param is absent', () => {
    expect(parseSlugFromSearch('')).toBeNull()
    expect(parseSlugFromSearch('?continent=EU')).toBeNull()
  })

  it('returns the slug when present alone', () => {
    expect(parseSlugFromSearch('?tournament=abc')).toBe('abc')
  })

  it('returns the slug among other params', () => {
    expect(parseSlugFromSearch('?continent=EU&tournament=abc')).toBe('abc')
  })

  it('returns null for an empty value', () => {
    expect(parseSlugFromSearch('?tournament=')).toBeNull()
  })
})

describe('buildSearchWithSlug', () => {
  it('adds the param to an empty search', () => {
    expect(buildSearchWithSlug('', 'abc')).toBe('?tournament=abc')
  })

  it('preserves other params when adding', () => {
    expect(buildSearchWithSlug('?continent=EU', 'abc')).toBe(
      '?continent=EU&tournament=abc',
    )
  })

  it('replaces an existing value', () => {
    expect(buildSearchWithSlug('?tournament=old', 'new')).toBe(
      '?tournament=new',
    )
  })

  it('removes the param when clearing, preserving others', () => {
    expect(buildSearchWithSlug('?tournament=abc&x=1', null)).toBe('?x=1')
  })

  it('returns empty string when clearing from empty search', () => {
    expect(buildSearchWithSlug('', null)).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- urlTournament`
Expected: FAIL — module `./urlTournament` introuvable.

- [ ] **Step 3: Write the implementation**

Créer `webapp/src/utils/urlTournament.ts` :

```ts
export const TOURNAMENT_URL_PARAM = 'tournament'

export function parseSlugFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)
  const slug = params.get(TOURNAMENT_URL_PARAM)
  return slug && slug.length > 0 ? slug : null
}

export function buildSearchWithSlug(
  search: string,
  slug: string | null,
): string {
  const params = new URLSearchParams(search)
  if (slug) {
    params.set(TOURNAMENT_URL_PARAM, slug)
  } else {
    params.delete(TOURNAMENT_URL_PARAM)
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

export function syncTournamentSlug(slug: string | null): void {
  if (typeof window === 'undefined' || typeof history === 'undefined') return
  try {
    const search = buildSearchWithSlug(window.location.search, slug)
    history.replaceState(null, '', window.location.pathname + search)
  } catch {
    // URL/history API unavailable — the URL stays as-is.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- urlTournament`
Expected: PASS (9 tests).

- [ ] **Step 5: Build + commit**

Run: `pnpm run build` — expected PASS.

```bash
git add webapp/src/utils/urlTournament.ts webapp/src/utils/urlTournament.test.ts
git commit -m "feat: add url helpers for tournament slug param"
```

---

### Task 2: `resolvePickerList` (fallback liste complète)

**Files:**
- Modify: `webapp/src/services/poloperator/filter.ts`
- Modify: `webapp/src/services/poloperator/filter.test.ts`

**Interfaces:**
- Consumes: `filterTournaments` existant, `Settings`, `TournamentSummary`.
- Produces: `resolvePickerList(list: TournamentSummary[] | null, settings: Settings, selectedSlug: string | null): TournamentSummary[] | null`. Utilisé par App (Task 3).

- [ ] **Step 1: Write the failing test**

Ajouter à la fin de `webapp/src/services/poloperator/filter.test.ts` (les helpers `makeTournament`, `baseSettings` et `liveEu/liveNa/finishedEu/futureEu` existent déjà) :

```ts
describe('resolvePickerList', () => {
  it('returns null when the list is null', () => {
    expect(resolvePickerList(null, baseSettings, 'a')).toBeNull()
  })

  it('returns the filtered list when no tournament is selected', () => {
    const out = resolvePickerList([liveEu, liveNa], baseSettings, null)
    expect(out).toEqual([liveEu])
  })

  it('returns the filtered list when the selected tournament is within the filters', () => {
    const out = resolvePickerList([liveEu, liveNa], baseSettings, 'a')
    expect(out).toEqual([liveEu])
  })

  it('falls back to the full list when the selected tournament is hidden by the filters', () => {
    const out = resolvePickerList([liveEu, liveNa], baseSettings, 'b')
    expect(out).toEqual([liveEu, liveNa])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- filter`
Expected: FAIL — `resolvePickerList is not defined`.

- [ ] **Step 3: Write the implementation**

Dans `webapp/src/services/poloperator/filter.ts`, après `filterTournaments` :

```ts
export function resolvePickerList(
  list: TournamentSummary[] | null,
  settings: Settings,
  selectedSlug: string | null,
): TournamentSummary[] | null {
  if (list === null) return null
  const filtered = filterTournaments(list, settings)
  if (!selectedSlug) return filtered
  return filtered.some((t) => t.slug === selectedSlug) ? filtered : list
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- filter`
Expected: PASS (9 tests).

- [ ] **Step 5: Build + commit**

Run: `pnpm run build` — expected PASS.

```bash
git add webapp/src/services/poloperator/filter.ts webapp/src/services/poloperator/filter.test.ts
git commit -m "feat: fall back to full tournament list when selection is hidden by filters"
```

---

### Task 3: Branchement dans App.tsx

**Files:**
- Modify: `webapp/src/App.tsx`

**Interfaces:**
- Consumes: `parseSlugFromSearch`, `syncTournamentSlug` (Task 1), `resolvePickerList` (Task 2), `loadTournamentRequested` / `loadTournamentsRequested` existants.
- Produces: lecture du slug URL au mount, auto-chargement du tournoi d'URL, écriture du slug dans l'URL à la sélection, picker sur la liste résolue. Aucun test (restyle/logique UI, pas de jsdom) — vérifié par build.

- [ ] **Step 1: Mettre à jour les imports**

Dans `webapp/src/App.tsx` :

1. Ligne 1 : `import { useEffect, useMemo, useState } from 'react'` → `import { useEffect, useMemo, useRef, useState } from 'react'`.
2. Ligne 13 : `import { filterTournaments } from './services/poloperator/filter'` → `import { resolvePickerList } from './services/poloperator/filter'`.
3. Après l'import `filter`/`resolvePickerList`, ajouter :

```ts
import {
  parseSlugFromSearch,
  syncTournamentSlug,
} from './utils/urlTournament'
```

- [ ] **Step 2: Lire le slug au mount et résoudre la liste**

Dans le corps de `App()`, remplacer le bloc `filteredList` (lignes 40-43) par :

```ts
const [urlSlug] = useState(() =>
  typeof window === 'undefined'
    ? null
    : parseSlugFromSearch(window.location.search),
)
const urlHandledRef = useRef(false)

const selectedSlug = useMemo(() => {
  if (summary?.slug) return summary.slug
  if (!urlSlug || !list) return null
  return list.some((t) => t.slug === urlSlug) ? urlSlug : null
}, [summary, urlSlug, list])

const pickerList = useMemo(
  () => resolvePickerList(list, settings, selectedSlug),
  [list, settings, selectedSlug],
)
```

Note : `summary` est déjà déclaré plus bas (`const summary = selected.summary`, ligne 68) mais utilisé dans ce `useMemo` — **déplacer la ligne `const summary = selected.summary` avant le bloc ci-dessus** (la supprimer de sa position actuelle), car `useMemo` référence `summary`.

- [ ] **Step 3: Auto-charger le tournoi d'URL**

Après le `useEffect` existant qui dispatche `loadTournamentsRequested()` (lignes 45-47), ajouter :

```ts
useEffect(() => {
  if (urlHandledRef.current) return
  if (!urlSlug || !list || selected.loading || selected.summary) return
  const summary = list.find((t) => t.slug === urlSlug)
  urlHandledRef.current = true
  if (!summary) return
  dispatch(loadTournamentRequested({ slug: urlSlug, summary }))
}, [urlSlug, list, selected.loading, selected.summary, dispatch])
```

- [ ] **Step 4: Écrire le slug dans l'URL à la sélection**

Ajouter le handler avant le `return` (après `handleRefresh`, ligne 66) :

```ts
const handleSelect = (t: TournamentSummary) => {
  dispatch(loadTournamentRequested({ slug: t.slug, summary: t }))
  syncTournamentSlug(t.slug)
}
```

Puis remplacer les props du `<TournamentPicker>` (lignes 83-90) :

```tsx
<TournamentPicker
  tournaments={pickerList}
  loading={listLoading}
  selectedSlug={selectedSlug}
  onSelect={handleSelect}
/>
```

- [ ] **Step 5: Build de vérification**

Run: `pnpm run build`
Expected: PASS (`tsc -b && vite build` sans erreur).

- [ ] **Step 6: Commit**

```bash
git add webapp/src/App.tsx
git commit -m "feat: load tournament from url param and sync selection to url"
```

---

### Task 4: Vérification finale

**Files:**
- Aucun fichier modifié.

- [ ] **Step 1: Lint**

Run: `pnpm run lint`
Expected: PASS (aucune erreur oxlint).

- [ ] **Step 2: Tests**

Run: `pnpm test`
Expected: PASS (tous les tests — 47 attendus : 38 existants + 9 urlTournament, et 4 `resolvePickerList` inclus dans le fichier `filter` déjà compté).

- [ ] **Step 3: Build complet**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 4: Contrôle manuel**

Run: `pnpm dev` (port 3003), vérifier dans le navigateur :
- Sélectionner un tournoi → l'URL devient `…?tournament=<slug>` sans rechargement.
- Copier l'URL, l'ouvrir dans un nouvel onglet → le tournoi se charge automatiquement.
- Avec un filtre qui masque le tournoi de l'URL (ex. `continent=EU` mais tournoi NA, ou `showLiveOnly` qui l'exclut) : le picker affiche la liste complète tant que le tournoi d'URL est sélectionné ; choisir ensuite un tournoi dans les filtres → la liste filtrée revient.
- Slug inconnu (`?tournament=zzz`) → rien n'est sélectionné, pas d'erreur, l'URL reste telle quelle.
- Refresh (60s / bouton) → le tournoi sélectionné est conservé et rechargé, l'URL reste cohérente.

Signaler toute anomalie au lieu de commit.