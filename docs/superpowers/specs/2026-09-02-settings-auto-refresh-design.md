# Design — Settings, auto-refresh & modal de configuration

Date: 2026-09-02
Status: draft

## Goal

Ajouter au webapp trois fonctionnalités :

1. Un bouton **Rafraîchir** qui se remplit sur 60 secondes puis redéclenche le
   rafraîchissement automatiquement.
2. Une **modal de configuration** avec des options pré-sélectionnées :
   - Afficher tournoi en cours (toggle, actif par défaut),
   - Nombre d'équipes suggérées (4 par défaut),
   - Filtre continent (Europe par défaut).
3. Ces options sont **persistées en localStorage**.

## Décisions validées avec l'utilisateur

- « Afficher tournoi en cours » = **filtre de la liste** : ne montre que les
  tournois `status === 'LIVE'` dans le menu déroulant.
- Le continent provient du champ **`continentCode`** présent dans les données
  RSC des tournois (ex. `"continentCode":"EU"`). Codes observés sur le site :
  `EU`, `NA`, `SA`, `AF`, `AS`, `OC` (le parseur ne le lit pas encore).
- Auto-refresh à 60 s : à 100 % le refresh se déclenche et la barre repart à 0.
- Clic sur le bouton = refresh immédiat + reset du timer.
- Rendu : **barre de progression horizontale** dans le bouton.
- Pas de pause du timer pendant le chargement ni sur erreur réseau.
- Approche : **slice Redux dédié** + localStorage + contrôleur/composant timer.
- Changements de réglages appliqués **en direct** (pas de bouton Save/Cancel).

## Types & données

`types/poloperator.ts` :

```ts
export type ContinentCode = 'EU' | 'NA' | 'SA' | 'AF' | 'AS' | 'OC'

export interface TournamentSummary {
  // …champs existants…
  continentCode: ContinentCode | null
}
```

`parseRsc.ts` : `normalizeTournament` lit `obj.continentCode` et le valide contre
`ContinentCode` (sinon `null`).

## Réglages (slice Redux)

`Settings` :

```ts
export interface Settings {
  showLiveOnly: boolean            // défaut true
  suggestedTeamCount: number       // défaut 4, borné 1–8
  continent: ContinentCode | 'ALL' // défaut 'EU'
}

export const DEFAULT_SETTINGS: Settings = {
  showLiveOnly: true,
  suggestedTeamCount: 4,
  continent: 'EU',
}
```

### Fichiers

- `store/settingsStorage.ts`
  - `loadSettings(): Settings` — lit `localStorage['poloperator:settings:v1']`,
    parse le JSON, fusionne avec `DEFAULT_SETTINGS` champ par champ, ignore les
    valeurs invalides. **Gardé** (try/catch, localStorage absent en node → défauts).
  - `saveSettings(settings: Settings): void` — écrit le JSON. **Gardé**.
- `store/settingsActions.ts`
  - `SETTINGS_UPDATE = 'SETTINGS_UPDATE'`
  - `updateSettings(partial: Partial<Settings>)`
- `store/settingsReducer.ts`
  - `initialState = loadSettings()` (évalué au module load).
  - `SETTINGS_UPDATE` : merge du partial, borne `suggestedTeamCount` à [1, 8],
    appelle `saveSettings` sur le nouvel état, retourne le nouvel état.
- `store/rootReducer.ts` : monter `settings`.

## Filtrage

`services/poloperator/filter.ts` — fonction pure :

```ts
export function filterTournaments(
  list: TournamentSummary[],
  settings: Settings,
): TournamentSummary[]
```

- Filtre continent : `settings.continent === 'ALL'` ou `t.continentCode === settings.continent`.
- Filtre live : `!settings.showLiveOnly` ou `t.status === 'LIVE'`.
- L'ordre retourné reste celui de l'entrée (le tri est fait dans `TournamentPicker`).

## RefreshButton (60 s)

`components/RefreshButton.tsx` — remplace le bouton actuel de `TournamentPicker` :

- Props : `{ loading: boolean; onRefresh: () => void; intervalMs?: number }`
  (`intervalMs` défaut 60 000).
- La logique temporelle est extraite dans un **contrôleur pur testable en node**,
  `utils/countdown.ts` :

  ```ts
  startCountdown({
    durationMs: number
    intervalMs: number        // ~250
    onTick: (remainingMs: number) => void
    onComplete: () => void
  }): () => void              // stop()
  ```

  - Tick périodique avec `setInterval` (ou `setTimeout` récursif) ; quand
    `remainingMs <= 0` → `onComplete()` + relance (auto-refresh).
  - Retourne une fonction `stop()` (nettoyage au démontage).
- `RefreshButton` : `useState(remainingMs)` + `useEffect` qui appelle
  `startCountdown` ; le clic appelle `stop()` puis relance depuis `intervalMs`.
- Rendu : bouton « Rafraîchir » + barre de progression horizontale
  (largeur = `1 - remainingMs / intervalMs`) + secondes restantes (ex. « 42 s »).
- `loading` → désactive le clic (mais le timer continue, pas de pause).

`App.tsx` : `handleRefresh` existant devient `onRefresh`.

## SettingsModal

`components/SettingsModal.tsx` :

- Props : `{ open: boolean; onClose: () => void; settings: Settings }` —
  lit `dispatch` via `useAppDispatch` pour appliquer `updateSettings`.
- Overlay sombre + panneau centré, fermeture par clic sur l'overlay, « Échap »
  ou bouton « Fermer ».
- Contrôles :
  - Toggle « Afficher tournoi en cours » → `showLiveOnly`.
  - Stepper « Nombre d'équipes suggérées » (1–8) → `suggestedTeamCount`.
  - Select « Continent » : `ALL` (Tous les continents) + 6 continents
    (EU Europe, NA Amérique du Nord, SA Amérique du Sud, AF Afrique,
    AS Asie, OC Océanie) → `continent`.
- Chaque interaction dispatch `updateSettings` (application en direct).

`App.tsx` : état local `settingsOpen`, bouton ⚙ dans le header qui ouvre la modal.

## Filtres appliqués

- `App.tsx` : `const filteredList = useMemo(() => filterTournaments(list ?? [], settings), [list, settings])`
  passé à `TournamentPicker` (`tournaments={filteredList}`).
- `TournamentPicker` :
  - Le bouton « Rafraîchir » est retiré (remplacé par `RefreshButton` dans le header).
  - Message « Aucun tournoi ne correspond aux filtres » quand la liste filtrée est vide.
- Tournoi sélectionné filtré : ses données restent affichées ; le `<select>`
  montre le placeholder « Choisir un tournoi » (valeur non présente parmi les options).
- `UpcomingMatches` : nouvelle prop `suggestionLimit: number` ; remplace le
  `slice(0, 3)` codé en dur par `slice(0, suggestionLimit)`.

## Tests (vitest, node env)

- `store/settingsReducer.test.ts` :
  - état initial = défauts quand `loadSettings` n'a rien (localStorage absent/mocké vide).
  - `SETTINGS_UPDATE` merge partiel et borne `suggestedTeamCount`.
  - `saveSettings` appelé avec le nouvel état (mock localStorage).
  - `loadSettings` avec JSON corrompu → défauts.
- `services/poloperator/filter.test.ts` : continent, live, combinaison, `ALL`.
- `services/poloperator/parseRsc.test.ts` : extraction de `continentCode` (EU/AS…).
- `utils/countdown.test.ts` : fake timers — auto-refresh à 60 s, tick régulier,
  `stop()` annule, reset après `onComplete`.

Les tests restent **node-only** (pas de jsdom) : la logique du timer est
testée via le contrôleur pur ; le découpage `suggestionLimit` est un simple
`slice` couvert par le test de `filter`/redaction du composant.

## Cas limites

- localStorage vide/corrompu → défauts, pas de crash.
- Tournoi sélectionné filtré → données conservées, placeholder dans le select.
- Aucun tournoi correspondant → message dans le sélecteur.
- Timer : continue pendant le chargement (pas de pause), pas de pause sur erreur.

## Hors scope

- Pas de backend (le refresh recharge les mêmes endpoints publics).
- Pas de bouton Save/Cancel dans la modal (application en direct).
- Pas de pause du timer sur erreur réseau.
- Pas de persistance du tournoi sélectionné.
- Pas d'ajout de dépendance de test (jsdom / testing-library) : tout reste node-only.