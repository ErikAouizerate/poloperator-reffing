# Help Button & Explanation Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `?` help button in the top-right of the header that opens a modal explaining the suggestion tiers, the multi-referee rules, and the refresh system.

**Architecture:** Standalone presentational `HelpModal.tsx` driven by local `useState` in `App.tsx`, reusing the `SettingsModal` interaction pattern (Escape, backdrop click, "Fermer"). Tier badge constants are extracted to a shared `tierStyles.ts` so the help modal renders the exact same badges as `UpcomingMatches`.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind CSS v4. No new dependency.

**Spec:** `docs/superpowers/specs/2026-09-06-help-modal-design.md`

## Global Constraints

- All commands run inside `webapp/` (`pnpm run lint`, `pnpm run build`, `pnpm test`).
- `pnpm run build` = `tsc -b && vite build` — typecheck is part of build.
- Lint is **oxlint** (config `.oxlintrc.json`), not ESLint.
- Tests: vitest, **node** env, only `src/**/*.test.ts` runs. **No jsdom / `.tsx` component tests configured** — do NOT add test files for components and do NOT add testing dependencies (out of scope per spec).
- No new dependency at all (nothing to `pnpm approve-builds`).
- UI copy is in **French**; code identifiers in English.
- No Redux for this feature — local `useState` only. No localStorage persistence, no first-visit auto-open.
- Modal pattern copied from `webapp/src/components/SettingsModal.tsx` (overlay, Escape listener, `stopPropagation`, Fermer button).

---

### Task 1: Extract shared tier badge styles

**Files:**
- Create: `webapp/src/components/tierStyles.ts`
- Modify: `webapp/src/components/UpcomingMatches.tsx` (remove lines 13–25, add import)

**Interfaces:**
- Consumes: nothing.
- Produces: `TIER_LABEL: Record<number, string>` and `TIER_BG: Record<number, string>` exported from `webapp/src/components/tierStyles.ts` — used by Task 2.

- [ ] **Step 1: Create `tierStyles.ts`**

```ts
export const TIER_LABEL: Record<number, string> = {
  1: 'Optimum',
  2: 'OK',
  3: 'Moins pire',
  4: 'À éviter',
}

export const TIER_BG: Record<number, string> = {
  1: 'bg-teal',
  2: 'bg-yellow',
  3: 'bg-orange',
  4: 'bg-red',
}
```

- [ ] **Step 2: Update `UpcomingMatches.tsx`**

Delete the local `TIER_LABEL` and `TIER_BG` constants (currently lines 13–25) and add to the imports at the top:

```ts
import { TIER_BG, TIER_LABEL } from "./tierStyles";
```

Everything else in the file stays untouched — the JSX already references `TIER_BG[s.tier]` / `TIER_LABEL[s.tier]`.

- [ ] **Step 3: Verify — tests, lint, build**

Run (inside `webapp/`):

```bash
pnpm test && pnpm run lint && pnpm run build
```

Expected: all existing tests PASS (pure refactor, no logic change), lint clean, build/typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/tierStyles.ts webapp/src/components/UpcomingMatches.tsx
git commit -m "refactor: extract tier badge label/bg constants to shared module"
```

---

### Task 2: HelpModal component

**Files:**
- Create: `webapp/src/components/HelpModal.tsx`

**Interfaces:**
- Consumes: `TIER_LABEL`, `TIER_BG` from `./tierStyles` (Task 1).
- Produces: `HelpModal({ open, onClose }: { open: boolean; onClose: () => void })` — used by Task 3.

- [ ] **Step 1: Create `HelpModal.tsx`**

Full file content (copy verbatim):

```tsx
import { useEffect } from 'react'
import { TIER_BG, TIER_LABEL } from './tierStyles'

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

function TierBadge({ tier }: { tier: 1 | 2 | 3 | 4 }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-md border-2 border-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink ${TIER_BG[tier]}`}
    >
      {TIER_LABEL[tier]}
    </span>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
      {children}
    </h3>
  )
}

export function HelpModal({ open, onClose }: HelpModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Aide"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[14px] border-2 border-ink bg-surface p-6 shadow-kit"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-black tracking-tight text-ink">
          Comment ça marche ?
        </h2>

        <section>
          <SectionTitle>Les niveaux de suggestion</SectionTitle>
          <p className="mt-2 text-sm text-ink">
            Règle de base : une équipe qui joue à la vague T arbitre deux
            vagues avant (T−2) et se repose à T−1. L'application propose,
            l'organisateur décide.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            <li className="flex items-start gap-2">
              <TierBadge tier={1} />
              <span>
                L'équipe joue dans 2 vagues (T+2) : arbitrer maintenant
                préserve son créneau de repos avant le match.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <TierBadge tier={2} />
              <span>L'équipe joue dans 3 vagues (T+3).</span>
            </li>
            <li className="flex items-start gap-2">
              <TierBadge tier={3} />
              <span>
                Pas de match proche connu (équipe éliminée, fin de journée,
                prochain match dans 4 vagues ou plus). Les équipes ayant joué
                il y a exactement 2 vagues passent en premier : c'est leur
                tour d'arbitrer.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <TierBadge tier={4} />
              <span>
                « Chaîne » : l'équipe joue à la vague suivante (T+1) ou vient
                juste de jouer (T−1) — pas de repos entre match et arbitrage.
              </span>
            </li>
          </ul>
          <p className="mt-2 text-sm text-muted">
            À niveau égal, l'équipe qui a le moins arbitré passe en premier,
            puis celle qui attend depuis le plus longtemps.
          </p>
        </section>

        <section className="mt-5">
          <SectionTitle>Plusieurs arbitres</SectionTitle>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
            <li>
              Deux matchs en parallèle n'ont jamais la même équipe comme
              première suggestion.
            </li>
            <li>
              Sur un match terminé, si l'arbitre et le co-arbitre appartiennent
              à des équipes différentes, chaque équipe prend +1 au compteur
              d'arbitrage (même équipe : un seul +1).
            </li>
          </ul>
        </section>

        <section className="mt-5">
          <SectionTitle>Rafraîchissement</SectionTitle>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
            <li>
              Les données se rafraîchissent automatiquement toutes les
              4 minutes (réglable de 15 s à 60 min via le bouton ⚙).
            </li>
            <li>
              Le bouton « Rafraîchir » affiche le compte à rebours ; cliquer
              dessus rafraîchit immédiatement et relance le timer.
            </li>
            <li>
              Suggestions et compteurs d'arbitrage sont recalculés à chaque
              rafraîchissement, à partir des données de poloperator.com.
            </li>
          </ul>
        </section>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border-2 border-ink bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit hover:bg-teal"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify — lint, build**

Run (inside `webapp/`):

```bash
pnpm run lint && pnpm run build
```

Expected: lint clean, build/typecheck clean. (No component test: none configured in this project, per Global Constraints.)

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/HelpModal.tsx
git commit -m "feat: add help modal explaining tiers, multi-referee rules and refresh"
```

---

### Task 3: Wire the help button into the header

**Files:**
- Modify: `webapp/src/App.tsx` (imports ~line 13, state ~line 45, header right group ~lines 188–195, modal render ~line 280)

**Interfaces:**
- Consumes: `HelpModal` from `./components/HelpModal` (Task 2).
- Produces: nothing (final wiring).

- [ ] **Step 1: Add the import in `App.tsx`**

Next to the existing `SettingsModal` import:

```tsx
import { HelpModal } from "./components/HelpModal";
```

- [ ] **Step 2: Add local state**

Right after `const [settingsOpen, setSettingsOpen] = useState(false);`:

```tsx
const [helpOpen, setHelpOpen] = useState(false);
```

- [ ] **Step 3: Add the `?` button in the header right group**

In the header's right `<div className="flex items-center gap-2 md:justify-self-end">`, **after** the ⚙ settings button (help is the rightmost button):

```tsx
<button
  type="button"
  onClick={() => setHelpOpen(true)}
  aria-label="Aide"
  title="Aide"
  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-surface text-sm text-ink hover:bg-teal"
>
  ?
</button>
```

- [ ] **Step 4: Render the modal**

Next to the existing `<SettingsModal … />` at the bottom of `App`:

```tsx
<HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
```

- [ ] **Step 5: Verify — tests, lint, build**

Run (inside `webapp/`):

```bash
pnpm test && pnpm run lint && pnpm run build
```

Expected: all PASS / clean.

- [ ] **Step 6: Manual smoke test**

Run `pnpm dev` (port 3003), then check in the browser:

- `?` button visible at the top-right of the header, after ⚙, same round style.
- Click opens the modal with the three sections (niveaux, plusieurs arbitres, rafraîchissement); tier badges show the same colors as in the suggestion lists (teal/yellow/orange/red).
- Closes via: « Fermer » button, Escape key, click on the dark backdrop.
- Content scrolls if the viewport is short (`max-h-[85vh]`).

Stop the dev server afterwards.

- [ ] **Step 7: Commit**

```bash
git add webapp/src/App.tsx
git commit -m "feat: add help button in header opening explanation modal"
```
