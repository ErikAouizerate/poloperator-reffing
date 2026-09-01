# Poloperator Style Kit Restyle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyler le webapp avec les tokens visuels du « Poloperator Style Kit » (palette crème/encre, Chivo auto-hébergée, bordures 2px, ombres dures), sans changer la structure ni la logique.

**Architecture:** Approche B — restyle uniquement. Tokens définis via Tailwind v4 `@theme` dans `src/index.css` + `@font-face` Chivo depuis `public/fonts/`. Chaque composant garde son markup/props ; seules les classes Tailwind changent. Aucun test unitaire ajouté (restyle pur, pas de jsdom) — la vérification est build + lint + vitest existants + contrôle visuel.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind CSS v4 (via `@tailwindcss/vite`, pas de `tailwind.config`) + Redux classic + Vitest (node env).

## Global Constraints

- Redux **classic** : `combineReducers` + RTK `configureStore` (thunks disabled). Pas de `createSlice`. Pas de changement de logique.
- Code, docs et tests en **anglais** ; chaînes UI en français (libellés existants inchangés).
- `pnpm run build` = `tsc -b && vite build` (typecheck inclus). `pnpm run lint` = **oxlint**. `pnpm test` = vitest.
- **Aucune nouvelle dépendance** (rien à `pnpm approve-builds`).
- Police Chivo **auto-hébergée** dans `webapp/public/fonts/` (pas de Google Fonts).
- **Thème clair uniquement** — tokens sombres du kit exclus.
- Pas de `#` CSS arbitraire au-delà du nécessaire : le shadow kit est déclaré en token `--shadow-kit`.
- Ne pas modifier `index.html` (le `<title>` et le favicon restent), ni `main.tsx`, ni `vite.config.ts`.

---

### Task 1: Tokens de thème + police Chivo auto-hébergée

**Files:**
- Create: `webapp/public/fonts/chivo-vietnamese.woff2`
- Create: `webapp/public/fonts/chivo-latin-ext.woff2`
- Create: `webapp/public/fonts/chivo-latin.woff2`
- Modify: `webapp/src/index.css`

**Interfaces:**
- Consumes: les woff2 embeddés dans `Poloperator Style Kit.html` (root du repo).
- Produces: tokens Tailwind v4 `bg`, `surface`, `ink`, `muted`, `teal`, `pink`, `yellow`, `mint`, `red`, `orange`, `chip`, `shadow-kit`, et la police `font-sans` = Chivo. Classes générées utilisées ensuite : `bg-bg`, `bg-surface`, `bg-teal`, `bg-pink`, `bg-yellow`, `bg-chip`, `text-ink`, `text-muted`, `border-ink`, `shadow-kit`, `accent-teal`, `font-sans`.

- [ ] **Step 1: Extraire les 3 woff2 du bundle du kit**

Exécuter depuis la racine du repo :

```bash
node -e '
const fs = require("fs");
const zlib = require("zlib");
const html = fs.readFileSync("Poloperator Style Kit.html", "utf8");
const m = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
const manifest = JSON.parse(m[1]);
const names = {
  "5424a146-0c32-41ff-a62c-13e4f7f9ba44": "chivo-vietnamese.woff2",
  "c25722d3-6421-4d8d-a65d-1ea8b642726b": "chivo-latin-ext.woff2",
  "e001705e-6cf5-4b92-a730-07ac1decb69a": "chivo-latin.woff2",
};
for (const [uuid, entry] of Object.entries(manifest)) {
  if (!entry.mime.startsWith("font/")) continue;
  const bytes = entry.compressed
    ? zlib.gunzipSync(Buffer.from(entry.data, "base64"))
    : Buffer.from(entry.data, "base64");
  fs.writeFileSync("webapp/public/fonts/" + names[uuid], bytes);
  console.log("wrote", names[uuid], bytes.length);
}
'
```

Expected: 3 lignes `wrote chivo-*.woff2` et les fichiers présents dans `webapp/public/fonts/`.

- [ ] **Step 2: Vérifier que les fichiers sont bien des woff2**

Run: `file webapp/public/fonts/*.woff2`
Expected: `Web Open Font Format (Version 2)` sur les 3 fichiers.

- [ ] **Step 3: Remplacer `src/index.css` par les tokens + `@font-face`**

Remplacer le contenu de `webapp/src/index.css` :

```css
@import "tailwindcss";

@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/chivo-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/chivo-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/chivo-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/chivo-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/chivo-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/chivo-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/chivo-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/chivo-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/chivo-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 900;
  font-display: swap;
  src: url('/fonts/chivo-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 900;
  font-display: swap;
  src: url('/fonts/chivo-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Chivo';
  font-style: normal;
  font-weight: 900;
  font-display: swap;
  src: url('/fonts/chivo-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@theme {
  --color-bg: #faf7ec;
  --color-surface: #fffdf7;
  --color-ink: #111111;
  --color-muted: #6f6a5e;
  --color-teal: #7fd3d8;
  --color-pink: #f9aab6;
  --color-yellow: #f6f0a8;
  --color-mint: #6fc39d;
  --color-red: #e94a5f;
  --color-orange: #f2a24a;
  --color-chip: #efece1;
  --shadow-kit: 4px 4px 0 #111111;
  --font-sans: 'Chivo', 'Helvetica Neue', Helvetica, sans-serif;
}

@layer base {
  body {
    background-color: var(--color-bg);
    color: var(--color-ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
}
```

- [ ] **Step 4: Build de vérification**

Run: `pnpm run build` (dans `webapp/`)
Expected: PASS (`tsc -b && vite build` sans erreur).

- [ ] **Step 5: Commit**

```bash
git add webapp/public/fonts webapp/src/index.css
git commit -m "style: add Chivo font and poloperator design tokens"
```

---

### Task 2: Coquille, header et error banner (App.tsx)

**Files:**
- Modify: `webapp/src/App.tsx`

**Interfaces:**
- Consumes: tokens de la Task 1 (`bg-bg`, `text-ink`, `text-muted`, `border-ink`, `bg-surface`, `shadow-kit`, `font-sans`, `bg-pink`).
- Produces: layout de la page aux couleurs kit ; l'en-tête et le bouton ⚙ restylés ; `ErrorBanner` restylé. Aucun changement de logique (`dispatch`, `selected`, `summary`, états de chargement inchangés).

- [ ] **Step 1: Restyler le `<main>` et l'en-tête**

Dans `webapp/src/App.tsx` :

1. `<main>` : `min-h-svh bg-neutral-950 text-neutral-50` → `min-h-svh bg-bg font-sans text-ink`.
2. `<h1>` : `text-2xl font-semibold tracking-tight` → `text-2xl font-black tracking-tight`.
3. `<p>` sous-titre : `text-sm text-neutral-400` → `text-sm text-muted`.
4. Bouton ⚙ (ligne 95-102) : remplacer `rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-teal-500 hover:text-teal-400` par `flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-surface text-sm text-ink hover:bg-teal` (bouton-icône de nav du kit : cercle bordure 2px, **sans** ombre dure — seuls les boutons d'action en ont).

- [ ] **Step 2: Restyler `ErrorBanner`**

La fonction `ErrorBanner` (fin de `App.tsx`) : remplacer la classe `mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300` par `mb-6 rounded-lg border-2 border-ink bg-pink px-4 py-3 text-sm font-medium text-ink`.

- [ ] **Step 3: Build de vérification**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/App.tsx
git commit -m "style: apply kit palette to app shell and header"
```

---

### Task 3: TournamentPicker

**Files:**
- Modify: `webapp/src/components/TournamentPicker.tsx`

**Interfaces:**
- Consumes: tokens de la Task 1.
- Produces: select aux couleurs kit ; le label « Tournoi » en petit label uppercase ; message « Aucun tournoi » en muted. Logique (tri, `onSelect`) inchangée.

- [ ] **Step 1: Restyler le composant**

Dans `webapp/src/components/TournamentPicker.tsx` :

1. `<label>` : `text-sm text-neutral-400` → `text-[11px] font-medium uppercase tracking-[0.14em] text-muted`.
2. `<select>` : remplacer la classe par `min-w-64 rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal`.
3. Message « Aucun tournoi… » : `text-xs text-neutral-500` → `text-xs text-muted`.

- [ ] **Step 2: Build de vérification**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/TournamentPicker.tsx
git commit -m "style: restyle tournament picker to kit"
```

---

### Task 4: RefreshButton

**Files:**
- Modify: `webapp/src/components/RefreshButton.tsx`

**Interfaces:**
- Consumes: tokens de la Task 1 (`border-ink`, `bg-surface`, `text-ink`, `bg-teal`, `shadow-kit`).
- Produces: bouton kit avec barre de progression teal. Logique (countdown, `onRefresh`) inchangée.

- [ ] **Step 1: Restyler le bouton et la barre de progression**

Dans `webapp/src/components/RefreshButton.tsx` :

1. `<button>` (ligne 54-58) : remplacer la classe par `relative overflow-hidden rounded-[10px] border-2 border-ink bg-surface px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit hover:bg-teal disabled:opacity-60`.
2. Barre de progression (ligne 60-64) : `bg-teal-500/25` → `bg-teal`.
3. Le `<span className="relative">` et les libellés (« Rafraîchir… », « Rafraîchir · Ns ») restent inchangés.

- [ ] **Step 2: Build de vérification**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/RefreshButton.tsx
git commit -m "style: restyle refresh button to kit"
```

---

### Task 5: UpcomingMatches

**Files:**
- Modify: `webapp/src/components/UpcomingMatches.tsx`

**Interfaces:**
- Consumes: tokens de la Task 1 (`border-ink`, `bg-surface`, `bg-chip`, `bg-teal`, `bg-yellow`, `bg-orange`, `text-ink`, `text-muted`, `shadow-kit`).
- Produces: cartes match kit avec badges tier colorés (T+2 teal, proche jaune, repli orange). Logique inchangée.

- [ ] **Step 1: Restyler le titre de section**

Dans `webapp/src/components/UpcomingMatches.tsx` :

1. `<h2>` : `mb-3 text-lg font-semibold text-neutral-100` → `mb-3 text-lg font-black tracking-tight text-ink`.
2. Message vide « Aucun match à venir… » : `text-sm text-neutral-500` → `text-sm text-muted`.

- [ ] **Step 2: Restyler la carte match**

1. `<li>` : `rounded-xl border border-neutral-800 bg-neutral-900/60 p-4` → `rounded-[14px] border-2 border-ink bg-surface p-4 shadow-kit`.
2. Ligne date/time (div ligne 55) : `text-xs text-neutral-400` → `text-xs text-muted` ; le span heure `text-neutral-300` → `text-ink`.
3. Badge terrain : `rounded bg-neutral-800 px-2 py-0.5` → `rounded-md border-2 border-ink bg-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink`.
4. Ligne équipes : `text-neutral-100` → `text-ink` ; le « vs » `text-neutral-500` → `text-muted`.

- [ ] **Step 3: Restyler les suggestions avec badges tier colorés**

1. Libellé « Arbitres suggérés » : `mb-1 text-xs text-neutral-500` → `mb-1 text-[11px] uppercase tracking-[0.14em] text-muted`.
2. Ajouter en tête de fichier, après `TIER_LABEL`, un mapping de fond par tier :

```ts
const TIER_BG: Record<number, string> = {
  1: 'bg-teal',
  2: 'bg-yellow',
  3: 'bg-orange',
}
```

3. Numéro de rang : `w-5 text-center text-xs text-neutral-500` → `w-5 text-center text-xs text-muted`.
4. Nom d'équipe : `text-neutral-200` → `text-ink`.
5. Badge tier (ligne 83-85) : remplacer `rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400` par `rounded-md border-2 border-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink ${TIER_BG[s.tier]}`.
6. Compteur d'arbitrages : `text-xs text-neutral-500` → `text-xs text-muted`.

- [ ] **Step 4: Build de vérification**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/components/UpcomingMatches.tsx
git commit -m "style: restyle match cards and tier badges to kit"
```

---

### Task 6: RefereeCounts

**Files:**
- Modify: `webapp/src/components/RefereeCounts.tsx`

**Interfaces:**
- Consumes: tokens de la Task 1 (`bg-chip`, `bg-teal`, `text-ink`, `text-muted`).
- Produces: barres d'arbitrage sur piste chip avec remplissage teal. Logique (`max`) inchangée.

- [ ] **Step 1: Restyler le composant**

Dans `webapp/src/components/RefereeCounts.tsx` :

1. `<h2>` : `mb-3 text-lg font-semibold text-neutral-100` → `mb-3 text-lg font-black tracking-tight text-ink`.
2. Nom d'équipe : `w-40 truncate text-neutral-200` → `w-40 truncate text-ink`.
3. Piste de barre : `h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-800` → `h-2.5 flex-1 overflow-hidden rounded-full bg-chip`.
4. Remplissage : `h-full rounded-full bg-teal-500/70` → `h-full rounded-full bg-teal`.
5. Valeur : `w-8 text-right tabular-nums text-neutral-400` → `w-8 text-right tabular-nums text-muted`.

- [ ] **Step 2: Build de vérification**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/RefereeCounts.tsx
git commit -m "style: restyle referee counters to kit"
```

---

### Task 7: SettingsModal

**Files:**
- Modify: `webapp/src/components/SettingsModal.tsx`

**Interfaces:**
- Consumes: tokens de la Task 1 (`bg-ink/60`, `bg-surface`, `border-ink`, `text-ink`, `text-muted`, `bg-teal`, `shadow-kit`, `accent-teal`).
- Produces: modal kit (panneau papier, overlay encre, champs et boutons restylés). Logique (`dispatch`, `updateSettings`, Escape) inchangée.

- [ ] **Step 1: Restyler l'overlay et le panneau**

Dans `webapp/src/components/SettingsModal.tsx` :

1. Overlay : `fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4` → `fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4`.
2. Panneau : `w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6` → `w-full max-w-sm rounded-[14px] border-2 border-ink bg-surface p-6 shadow-kit`.
3. `<h2>` : `mb-5 text-lg font-semibold text-neutral-100` → `mb-5 text-lg font-black tracking-tight text-ink`.

- [ ] **Step 2: Restyler les champs et contrôles**

1. Libellé « Afficher tournoi en cours » : `text-sm text-neutral-200` → `text-sm text-ink`.
2. Checkbox : `h-4 w-4 accent-teal-500` → `h-4 w-4 accent-teal`.
3. Libellé « Nombre d'équipes suggérées » : `text-sm text-neutral-200` → `text-sm text-ink`.
4. Boutons − / + : remplacer `h-8 w-8 rounded border border-neutral-700 text-neutral-300 hover:border-teal-500 hover:text-teal-400` par `h-8 w-8 rounded-[10px] border-2 border-ink bg-surface text-ink shadow-kit hover:bg-teal`.
5. Valeur du compteur : `w-8 text-center text-sm text-neutral-100` → `w-8 text-center text-sm font-bold text-ink`.
6. Libellé « Continent » : `mt-5 block text-sm text-neutral-200` → `mt-5 block text-sm text-ink`.
7. `<select>` Continent : remplacer la classe par `mt-1 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal`.

- [ ] **Step 3: Restyler le bouton Fermer**

Le bouton « Fermer » (ligne 126-134) : remplacer `rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-teal-500 hover:text-teal-400` par `rounded-[10px] border-2 border-ink bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit hover:bg-teal`.

- [ ] **Step 4: Build de vérification**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/components/SettingsModal.tsx
git commit -m "style: restyle settings modal to kit"
```

---

### Task 8: Vérification finale

**Files:**
- Aucun fichier modifié.

- [ ] **Step 1: Lint**

Run: `pnpm run lint`
Expected: PASS (aucune erreur oxlint).

- [ ] **Step 2: Tests**

Run: `pnpm test`
Expected: PASS (tous les tests vitest existants — restyle sans impact logique).

- [ ] **Step 3: Build complet**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 4: Contrôle visuel manuel**

Run: `pnpm dev` (port 3003), vérifier dans le navigateur :
- Fond crème `#FAF7EC`, police Chivo partout (header, cartes, select, modal).
- Header : titre noir 900, sous-titre muted, bouton ⚙ rond bordure encre avec ombre dure.
- Picker : label « TOURNOI » uppercase, select papier à bordure 2px encre.
- Refresh : bouton avec ombre dure, barre de progression teal, hover teal.
- Matchs : cartes papier bordure encre + ombre `4px 4px`, badges tier teal/jaune/orange.
- Compteurs : piste `#EFECE1`, remplissage teal.
- Modal : panneau papier, overlay encre, boutons −/+/Fermer au style kit.
- ErrorBanner (si erreur réseau) : fond rose, bordure encre.

Signaler toute anomalie visuelle au lieu de commit.