# Design — Améliorations UI v2 (IMPROVEMENTS.md)

Date: 2026-09-02
Status: approved, ready to implement

## Contexte

Retour utilisateur (2e lot) sur l'app webapp (React 19 + Vite + TS + Tailwind v4 +
Redux classic). Le 1er lot (co-arbitre, tier 4, partage, déplier les vagues,
largeurs) est déjà implémenté. Ce lot porte uniquement sur l'UI et la config.

## Décisions validées avec l'utilisateur

1. **Refresh mobile** : le bouton Rafraîchir sort du header **en mobile uniquement**
   et se place sous le select. Sur desktop il reste centré dans le header.
2. **Chevrons déplier/replier** : icônes chevron en **haut à droite** et **en bas à
   droite** autour de la liste des matchs à venir, **synchronisées** (même état).
3. **Temps de rafraîchissement** : **champ libre en secondes** dans la config.
4. **Popup participants** : **tooltip natif au survol** (`title`) sur le nom
   d'équipe dans les cartes « match à venir », listant les participants.

## 1. Header & refresh (mobile)

- Header : `flex items-center justify-between` sur mobile ;
  `md:grid md:grid-cols-[1fr_auto_1fr] items-center` sur desktop pour garder le
  refresh centré.
- **Timer unique** : extraire la logique de `RefreshButton` dans un hook
  `useAutoRefresh(intervalMs, onRefresh)` tenu une seule fois dans `App`.
  Il renvoie `{ remainingMs, restart }`.
- `RefreshButton` devient **présentationnel** : props
  `{ loading, remainingMs, intervalMs, onClick, className }` (rendu = bouton avec
  barre de progression + secondes, inchangé visuellement).
- Deux rendus du même état :
  - header centre : `<RefreshButton ... className="hidden md:block" />` ;
  - sous le select (mobile) : `<RefreshButton ... className="md:hidden w-full" />`.
- Le clic sur l'un ou l'autre relance le **même** compte-à-rebours (via `restart`).

### `useAutoRefresh` (hook)

```ts
function useAutoRefresh(opts: {
  intervalMs: number
  onRefresh: () => void
}): { remainingMs: number; restart: () => void }
```

- utilise `startCountdown` (`utils/countdown.ts`) ;
- `restart()` = stop + relance depuis `intervalMs` et remet `remainingMs` ;
- l'effet redémarre quand `intervalMs` change (nouveau réglage de config).

## 2. Bouton partager = icône

- `App.tsx` : le bouton « Partager »/« Copié » devient une **icône SVG** (share).
  Quand `copied` est vrai, afficher brièvement une icône « check ».
- `aria-label="Copier le lien"`, `title="Copier le lien du tournoi"` conservés.

## 3. Select full width

- `TournamentPicker.tsx` : remplacer
  `w-full min-w-0 max-w-full ... sm:w-auto sm:min-w-64` par `w-full min-w-0`
  (pleine largeur du conteneur).

## 4. En-tête du tournoi

- `App.tsx` : envelopper `h2` (titre) + `<a>` (Voir sur Poloperator ↗) dans
  `flex items-center justify-between` → titre à gauche, lien à droite.
- Élargir l'espace titre ↔ description : `mt-1` → `mt-3` sur le `<p>`.

## 5. Chevrons déplier/replier (matchs à venir)

`UpcomingMatches.tsx` :

- Le toggle texte « Déplier »/« Replier » devient une **icône chevron** :
  - **en haut à droite** : ligne `flex items-center justify-between gap-3`
    contenant le `h2` (gauche) et le bouton chevron (droite) ;
  - **en bas à droite** : bouton chevron aligné à droite, sous la liste.
- Les deux boutons sont liés au **même** `expanded` (état synchronisé).
- Chevron **↓** quand replié (déplier), **↑** quand déplié (replier).
- `aria-label` « Déplier » / « Replier » ; n'apparaissent que si
  `hasMoreWaves`.

## 6. Temps de rafraîchissement (config)

- `store/settings.ts` : `Settings.refreshIntervalSeconds: number` (**défaut 240**).
- `store/settingsReducer.ts` : clamp `[15, 3600]` sur `SETTINGS_UPDATE`.
- `store/settingsStorage.ts` : chargement/sauvegarde du champ (validation
  numérique + clamp au chargement).
- `components/SettingsModal.tsx` : champ **libre en secondes**
  `<input type="number" min={15} max={3600}>` → dispatch `updateSettings`.
- `App.tsx` : `intervalMs = settings.refreshIntervalSeconds * 1000` passé au hook.

## 7. Tooltip participants (cartes « match à venir »)

- `App.tsx` : exposer les noms des joueurs par équipe
  (`playerNamesById(teamId): string[]`, construit depuis `selected.data.teams`).
- `UpcomingMatches.tsx` : nouvelle prop
  `playerNamesById: (teamId: string | null) => string[]` ;
  sur les `<span>` des noms d'équipe, ajouter
  `title={names.length > 0 ? names.join(" · ") : undefined}` (tooltip natif au
  survol, cohérent avec `RefereeCounts`).

## Tests & vérification

- `store/settingsReducer.test.ts` :
  - `DEFAULT_SETTINGS` inclut désormais `refreshIntervalSeconds` (les assertions
    `toEqual(DEFAULT_SETTINGS)` restent valides) ;
  - nouveau test : clamp de `refreshIntervalSeconds` à `[15, 3600]`.
- `pnpm test`, `pnpm run build` (typecheck), `pnpm run lint`.

## Fichiers touchés

- `webapp/src/App.tsx`
- `webapp/src/components/RefreshButton.tsx` (refactor → présentationnel)
- `webapp/src/components/TournamentPicker.tsx`
- `webapp/src/components/SettingsModal.tsx`
- `webapp/src/components/UpcomingMatches.tsx`
- `webapp/src/hooks.ts` (ou nouveau fichier) — `useAutoRefresh`
- `webapp/src/store/settings.ts`, `settingsReducer.ts`, `settingsStorage.ts`
- `webapp/src/store/settingsReducer.test.ts`

## Hors périmètre

- Backend / NestJS.
- Changement du moteur de prédiction.
- Thème sombre / autres tokens du kit.
