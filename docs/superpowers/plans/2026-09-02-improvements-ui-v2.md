# IMPROVEMENTS UI v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer le lot UI v2 de `IMPROVEMENTS.md` : header/responsive du bouton Rafraîchir, bouton partager en icône, select full width, layout titre/lien du tournoi, chevrons déplier/replier, temps de rafraîchissement configurable, et tooltip des participants sur les cartes match à venir.

**Architecture:** Refactor du timer du bouton Rafraîchir en un hook `useAutoRefresh` (timer unique) + `RefreshButton` présentationnel rendu à deux endroits (header desktop / sous-select mobile). Le temps de rafraîchissement devient un réglage `Settings` persistant (localStorage) avec clamp. Changements UI isolés dans leurs composants. Tests vitest node-only pour le reducer settings.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind v4 + Redux classic ; vitest 4.1 (node env) ; oxlint.

## Global Constraints

- **Langue** : communication utilisateur en français ; **code, doc et tests en anglais** ; messages de commit en anglais (convention du repo).
- **Redux classic** : pas de `createSlice` ; pas de nouvelle dépendance.
- **Commandes** (dans `webapp/`) : `pnpm test` (vitest run), `pnpm run build` (tsc -b && vite build — le typecheck fait partie du build), `pnpm run lint` (oxlint).
- **No jsdom** : pas de test de composant ; tests node-only (reducer settings, utils).
- **Default refresh interval** : `240` secondes ; clamp `[15, 3600]`.
- Les changements UI sans logique sont validés par `pnpm run build && pnpm run lint` (typecheck).

---

### Task 1: Réglage `refreshIntervalSeconds` (model + reducer + storage + tests)

**Files:**
- Modify: `webapp/src/store/settings.ts`
- Modify: `webapp/src/store/settingsReducer.ts`
- Modify: `webapp/src/store/settingsStorage.ts`
- Test: `webapp/src/store/settingsReducer.test.ts`

**Interfaces:**
- Consumes: `Settings` existant ; `saveSettings`/`loadSettings` existants.
- Produces: `Settings.refreshIntervalSeconds: number` (défaut 240), clamp `[15, 3600]` au reducer **et** au chargement storage. Consommé par Task 3 (interval du timer) et Task 8 (modal).

- [ ] **Step 1: Écrire le test qui échoue (clamp refreshIntervalSeconds)**

Dans `webapp/src/store/settingsReducer.test.ts`, après le test « clamps suggestedTeamCount to [1, 8] », ajouter :

```ts
it('clamps refreshIntervalSeconds to [15, 3600]', () => {
  __setStorage(makeStorage())
  const state = settingsReducer(undefined, { type: 'INIT' })
  const high = settingsReducer(
    state,
    updateSettings({ refreshIntervalSeconds: 99999 }),
  )
  expect(high.refreshIntervalSeconds).toBe(3600)
  const low = settingsReducer(
    state,
    updateSettings({ refreshIntervalSeconds: 2 }),
  )
  expect(low.refreshIntervalSeconds).toBe(15)
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd webapp && pnpm vitest run src/store/settingsReducer.test.ts`
Expected: FAIL — `refreshIntervalSeconds` n'existe pas encore dans `Settings`.

- [ ] **Step 3: Ajouter le champ au type et au défaut**

Dans `webapp/src/store/settings.ts` :

```ts
export interface Settings {
  showLiveOnly: boolean
  suggestedTeamCount: number
  continent: ContinentCode | 'ALL'
  refreshIntervalSeconds: number
}
```

```ts
export const DEFAULT_SETTINGS: Settings = {
  showLiveOnly: true,
  suggestedTeamCount: 4,
  continent: 'EU',
  refreshIntervalSeconds: 240,
}
```

- [ ] **Step 4: Clamp dans le reducer**

Dans `webapp/src/store/settingsReducer.ts`, ajouter la fonction et le champ dans `SETTINGS_UPDATE` :

```ts
function clampSeconds(value: number): number {
  return Math.min(3600, Math.max(15, Math.round(value)))
}
```

Dans le `next` du `case SETTINGS_UPDATE`, après le bloc `suggestedTeamCount` :

```ts
        refreshIntervalSeconds:
          typeof partial.refreshIntervalSeconds === 'number'
            ? clampSeconds(partial.refreshIntervalSeconds)
            : state.refreshIntervalSeconds,
```

- [ ] **Step 5: Clamp au chargement storage**

Dans `webapp/src/store/settingsStorage.ts`, ajouter la fonction et le champ dans `loadSettings` :

```ts
function clampSeconds(value: number): number {
  return Math.min(3600, Math.max(15, Math.round(value)))
}
```

Dans l'objet retourné de `loadSettings`, après `continent` :

```ts
      refreshIntervalSeconds:
        typeof parsed.refreshIntervalSeconds === 'number' &&
        Number.isFinite(parsed.refreshIntervalSeconds)
          ? clampSeconds(parsed.refreshIntervalSeconds)
          : DEFAULT_SETTINGS.refreshIntervalSeconds,
```

- [ ] **Step 6: Lancer le test pour vérifier qu'il passe**

Run: `cd webapp && pnpm vitest run src/store/settingsReducer.test.ts`
Expected: PASS (les assertions `toEqual(DEFAULT_SETTINGS)` restent valides).

- [ ] **Step 7: Build + lint**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add webapp/src/store/settings.ts webapp/src/store/settingsReducer.ts webapp/src/store/settingsStorage.ts webapp/src/store/settingsReducer.test.ts
git commit -m "feat: add configurable refresh interval seconds setting"
```

---

### Task 2: Refactor `RefreshButton` → hook `useAutoRefresh` + composant présentationnel

**Files:**
- Modify: `webapp/src/components/RefreshButton.tsx`

**Interfaces:**
- Consumes: `startCountdown` de `utils/countdown.ts`.
- Produces:
  - `useAutoRefresh({ intervalMs, onRefresh }) → { remainingMs, restart }` — timer unique, redémarre quand `intervalMs` change.
  - `RefreshButton({ loading, remainingMs, intervalMs, onClick, className? })` — rendu pur (barre de progression + secondes), sans logique de timer.
  - Consommés par Task 3 (App).

- [ ] **Step 1: Réécrire `RefreshButton.tsx`**

Remplacer tout le contenu de `webapp/src/components/RefreshButton.tsx` par :

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { startCountdown } from "../utils/countdown";

const TICK_MS = 250;

export function useAutoRefresh({
  intervalMs,
  onRefresh,
}: {
  intervalMs: number;
  onRefresh: () => void;
}): { remainingMs: number; restart: () => void } {
  const [remainingMs, setRemainingMs] = useState(intervalMs);
  const stopRef = useRef<(() => void) | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const intervalMsRef = useRef(intervalMs);

  onRefreshRef.current = onRefresh;
  intervalMsRef.current = intervalMs;

  const restart = useCallback(() => {
    stopRef.current?.();
    setRemainingMs(intervalMsRef.current);
    stopRef.current = startCountdown({
      durationMs: intervalMsRef.current,
      intervalMs: TICK_MS,
      onTick: setRemainingMs,
      onComplete: () => onRefreshRef.current(),
    });
  }, []);

  useEffect(() => {
    restart();
    return () => stopRef.current?.();
  }, [intervalMs, restart]);

  return { remainingMs, restart };
}

interface RefreshButtonProps {
  loading: boolean;
  remainingMs: number;
  intervalMs: number;
  onClick: () => void;
  className?: string;
}

export function RefreshButton({
  loading,
  remainingMs,
  intervalMs,
  onClick,
  className = "",
}: RefreshButtonProps) {
  const progress = 1 - remainingMs / intervalMs;
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`relative overflow-hidden rounded-[10px] border-2 border-ink bg-surface px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit hover:bg-teal disabled:opacity-60 ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-teal/60"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative">
        {loading ? (
          "Rafraîchir…"
        ) : (
          <>
            Rafraîchir ·{" "}
            <span className="inline-block w-[4ch] text-left tabular-nums tracking-[0]">
              {seconds}
            </span>
            s
          </>
        )}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Build + lint (typecheck de la refonte)**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/RefreshButton.tsx
git commit -m "refactor: extract auto-refresh into a shared hook"
```

---

### Task 3: App — header responsive (refresh sous le select en mobile) + câblage interval

**Files:**
- Modify: `webapp/src/App.tsx`

**Interfaces:**
- Consumes: `useAutoRefresh`, `RefreshButton` (Task 2) ; `settings.refreshIntervalSeconds` (Task 1).
- Produces: header `flex md:grid-cols-[1fr_auto_1fr]` ; refresh rendu 2× (header desktop + sous-select mobile), partageant le même timer.

- [ ] **Step 1: Câbler le hook et l'interval**

Dans `webapp/src/App.tsx`, remplacer l'import de `RefreshButton` par :

```ts
import { RefreshButton, useAutoRefresh } from "./components/RefreshButton";
```

Après `const handleRefresh = () => {...};`, ajouter :

```ts
  const refreshIntervalMs = settings.refreshIntervalSeconds * 1000;
  const { remainingMs, restart } = useAutoRefresh({
    intervalMs: refreshIntervalMs,
    onRefresh: handleRefresh,
  });
```

- [ ] **Step 2: Header responsive (desktop centré, mobile minimal)**

Remplacer le conteneur du header et le rendu du refresh :

```tsx
        <div className="flex items-center justify-between gap-4 px-6 py-3 md:grid md:grid-cols-[1fr_auto_1fr]">
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
            remainingMs={remainingMs}
            intervalMs={refreshIntervalMs}
            onClick={restart}
            className="hidden md:block"
          />
          <div className="flex items-center gap-2 md:justify-self-end">
            {/* boutons partage + config, inchangés */}
          </div>
        </div>
```

- [ ] **Step 3: Ajouter le refresh sous le select (mobile uniquement)**

Autour du `TournamentPicker` dans le body, ajouter en dessous :

```tsx
        <div className="mb-8">
          <TournamentPicker
            tournaments={pickerList}
            loading={listLoading}
            selectedSlug={selectedSlug}
            onSelect={handleSelect}
          />
          <div className="mt-3 md:hidden">
            <RefreshButton
              loading={listLoading || selected.loading}
              remainingMs={remainingMs}
              intervalMs={refreshIntervalMs}
              onClick={restart}
              className="w-full"
            />
          </div>
        </div>
```

- [ ] **Step 4: Build + lint**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/App.tsx
git commit -m "feat: responsive header with refresh under select on mobile"
```

---

### Task 4: App — bouton partager en icône + layout titre/lien du tournoi

**Files:**
- Modify: `webapp/src/App.tsx`

**Interfaces:**
- Consumes: state `copied` existant.
- Produces: bouton partage en icône SVG (share/check) ; titre à gauche + lien à droite avec espace élargi.

- [ ] **Step 1: Remplacer le bouton « Partager » texte par une icône**

Dans le groupe `flex items-center gap-2 md:justify-self-end`, remplacer le bouton partage par :

```tsx
            <button
              type="button"
              onClick={handleShare}
              aria-label="Copier le lien"
              title="Copier le lien du tournoi"
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-surface text-ink hover:bg-teal"
            >
              {copied ? (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M12 3v13m0 0l-4-4m4 4l4-4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 13v6h14v-6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
```

- [ ] **Step 2: Layout titre/lien du tournoi + espace description**

Remplacer le bloc titre + lien + description :

```tsx
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                  {summary.name}
                </h2>
                <a
                  href={`https://poloperator.com/fr/tournament/${summary.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-[10px] border-2 border-ink bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit transition-transform hover:-translate-y-0.5 hover:bg-teal"
                >
                  Voir sur Poloperator ↗
                </a>
              </div>
              <p className="mt-3 text-sm text-muted">
                {formatTournamentDates(summary)} · {selected.data.teams.length}{" "}
                équipes · {timeline.upcoming.length} match à venir
                {timeline.upcoming.length > 1 ? "s" : ""}
                {timeline.live.length > 0
                  ? ` · ${timeline.live.length} match${timeline.live.length > 1 ? "s" : ""} en cours`
                  : ""}
              </p>
```

- [ ] **Step 3: Build + lint**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/App.tsx
git commit -m "ui: share button as icon, align tournament title and link"
```

---

### Task 5: Select full width

**Files:**
- Modify: `webapp/src/components/TournamentPicker.tsx`

**Interfaces:**
- Consumes: rien de nouveau.
- Produces: `<select>` pleine largeur (retrait du `sm:w-auto sm:min-w-64`).

- [ ] **Step 1: Passer le select en full width**

Remplacer la classe du `<select>` :

```tsx
        className="w-full min-w-0 truncate rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal"
```

- [ ] **Step 2: Build + lint**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/TournamentPicker.tsx
git commit -m "ui: make tournament select full width"
```

---

### Task 6: Chevrons déplier/replier autour de la liste des matchs à venir

**Files:**
- Modify: `webapp/src/components/UpcomingMatches.tsx`

**Interfaces:**
- Consumes: state `expanded` existant, `hasMoreWaves`.
- Produces: boutons chevron (icône) en haut à droite et en bas à droite, synchronisés sur `expanded` ; suppression du bouton texte « Déplier »/« Replier ».

- [ ] **Step 1: Ajouter un sous-composant chevron**

En tête de `webapp/src/components/UpcomingMatches.tsx` (avant `UpcomingMatches`), ajouter :

```tsx
function ChevronToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={expanded ? "Replier" : "Déplier"}
      title={expanded ? "Replier" : "Déplier"}
      className="flex h-8 w-8 items-center justify-center rounded-[10px] border-2 border-ink bg-surface text-ink shadow-kit hover:bg-teal"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <path
          d={expanded ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
```

- [ ] **Step 2: Remplacer le bouton texte par les deux chevrons**

Remplacer le bloc actuel `{hasMoreWaves ? (<button ...>...</button>) : null}` + `<ul ...>` par :

```tsx
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">
          Matchs à venir & arbitres suggérés
        </h2>
        {hasMoreWaves ? (
          <ChevronToggle
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
          />
        ) : null}
      </div>
      <ul className="space-y-3">
        {visibleMatches.map((entry) => (
          ... (contenu actuel inchangé)
        ))}
      </ul>
      {hasMoreWaves ? (
        <div className="mt-3 flex justify-end">
          <ChevronToggle
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
          />
        </div>
      ) : null}
```

NB : retirer l'ancien `{hasMoreWaves ? (<button ...>...) : null}` qui se trouvait avant le `<ul>`, et le `h2` déplacé dans la ligne `justify-between`.

- [ ] **Step 3: Build + lint**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/UpcomingMatches.tsx
git commit -m "ui: chevron expand/collapse at top-right and bottom-right of upcoming matches"
```

---

### Task 7: Tooltip participants sur les noms d'équipe (cartes match à venir)

**Files:**
- Modify: `webapp/src/App.tsx`
- Modify: `webapp/src/components/UpcomingMatches.tsx`

**Interfaces:**
- Consumes: `Team.playerNames` (déjà présent dans le modèle) ; `teamNameById` existant.
- Produces: prop `playerNamesById: (teamId: string | null) => string[]` sur `UpcomingMatches` ; tooltip natif (`title`) listant les participants sur les noms d'équipe.

- [ ] **Step 1: Exposer les noms de joueurs par équipe dans App**

Dans `webapp/src/App.tsx`, après `teamNameById`, ajouter :

```ts
  const playerNamesById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const team of selected.data?.teams ?? []) {
      map.set(team.id, team.playerNames);
    }
    return (teamId: string | null) =>
      teamId ? (map.get(teamId) ?? []) : [];
  }, [selected.data]);
```

- [ ] **Step 2: Passer la prop à UpcomingMatches**

Dans `App.tsx`, ajouter `playerNamesById={playerNamesById}` aux props de `<UpcomingMatches ...>`.

- [ ] **Step 3: Ajouter la prop et les tooltips dans UpcomingMatches**

Dans `webapp/src/components/UpcomingMatches.tsx`, ajouter au type de props et déstructurer :

```ts
interface UpcomingMatchesProps {
  matches: UpcomingWithHorizon[];
  suggestionsByMatch: Record<string, RefereeSuggestion[]>;
  teamNameById: (teamId: string | null) => string;
  playerNamesById: (teamId: string | null) => string[];
  suggestionLimit: number;
}
```

Dans le composant, ajouter une helper :

```tsx
  const participants = (teamId: string | null) => {
    const names = playerNamesById(teamId);
    return names.length > 0 ? names.join(" · ") : undefined;
  };
```

Remplacer les deux rendus de nom d'équipe :

```tsx
              <span title={participants(entry.match.teamAId)}>
                {teamNameById(entry.match.teamAId)}
              </span>
```

et

```tsx
              <span title={participants(entry.match.teamBId)}>
                {teamNameById(entry.match.teamBId)}
              </span>
```

- [ ] **Step 4: Build + lint**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/App.tsx webapp/src/components/UpcomingMatches.tsx
git commit -m "feat: show participants tooltip on team names in upcoming match cards"
```

---

### Task 8: Champ temps de rafraîchissement dans la modal de config

**Files:**
- Modify: `webapp/src/components/SettingsModal.tsx`

**Interfaces:**
- Consumes: `Settings.refreshIntervalSeconds` (Task 1) ; `updateSettings` (existant).
- Produces: champ libre en secondes (`<input type="number" min={15} max={3600}>`) qui dispatch `updateSettings`.

- [ ] **Step 1: Ajouter le champ dans la modal**

Dans `webapp/src/components/SettingsModal.tsx`, après le bloc `<label ...>Continent ...</label>`, ajouter :

```tsx
        <label className="mt-5 block text-sm text-ink">
          Temps de rafraîchissement (secondes)
          <input
            type="number"
            min={15}
            max={3600}
            value={settings.refreshIntervalSeconds}
            onChange={(e) => {
              const value = e.target.value === "" ? 15 : Number(e.target.value);
              if (!Number.isFinite(value)) return;
              dispatch(updateSettings({ refreshIntervalSeconds: value }));
            }}
            className="mt-1 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal"
          />
        </label>
```

- [ ] **Step 2: Build + lint**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/SettingsModal.tsx
git commit -m "feat: add refresh interval field to settings modal"
```

---

## Self-Review

**Couverture spec → tâche :**
- Point 1 (refresh mobile sous le select, header non écrasé) → Task 3. ✔
- Point 2 (bouton partager icône) → Task 4 Step 1. ✔
- Point 3 (select full width) → Task 5. ✔
- Point 4 (titre gauche / lien droite, espace titre↔description) → Task 4 Step 2. ✔
- Point 5 (chevrons haut/bas à droite synchronisés) → Task 6. ✔
- Point 6 (temps de rafraîchissement config) → Tasks 1 + 8. ✔
- Point 7 (tooltip participants cartes match à venir) → Task 7. ✔

**Placeholder scan :** aucun « TBD » ; chaque step contient du code concret. Task 6 Step 2 référence « contenu actuel inchangé » pour le corps des `<li>` (justifié : le mapping des cartes ne change pas, seuls la structure de section et les chevrons changent).

**Cohérence des types :**
- `refreshIntervalSeconds` défini en Task 1, consommé en Task 3 (`settings.refreshIntervalSeconds * 1000`) et Task 8. ✔
- `useAutoRefresh`/`RefreshButton` signatures définies en Task 2, consommées en Task 3. ✔
- `playerNamesById` signature définie en Task 7 Step 1/3, cohérente dans App et UpcomingMatches. ✔
