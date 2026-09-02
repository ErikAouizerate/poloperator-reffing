# Design — Améliorations IMPROVEMENTS.md

Date: 2026-09-02
Status: approved, ready to implement

## Contexte

Retour utilisateur rassemblé dans `IMPROVEMENTS.md`. Sept points d'amélioration
sur l'app webapp (React 19 + Vite + TS + Tailwind v4 + Redux classic). Ce doc
verrouille les décisions avant implémentation.

## 1. Commit préalable

Les modifications non commitées (titre `index.html`, tri ascendant des compteurs,
typo bouton rafraîchir, police Chakra Petch + thème) sont committées en un commit,
avec les fichiers `.woff2` de la police (nécessaires, référencés par `index.css`).

**Exclus du commit** : `IMPROVEMENTS.md` et `Poloperator Style Kit.html`.

## 2. Deux arbitres par match

Le RSC poloperator expose `referee` **et** `coReferee`. Actuellement seul
`referee` est parsé ; 33 matchs de la fixture ont 2 arbitres d'équipes
**différentes** (69 mêmes équipes, 12 un seul arbitre). Il faut compter un
arbitrage **pour chaque équipe distincte** qui arbitre un match.

- `types/poloperator.ts` : `Match` gagne `coRefereePlayerId` / `coRefereeName`.
- `parseRsc.ts` : parser `obj.coReferee` en plus de `obj.referee`.
- `prediction/index.ts` : `refereeTeamIdByMatchId` devient
  `Map<matchId, teamId[]>` (équipes distinctes par match). `historyStats` et
  `refereeCounts` incrémentent **chaque équipe distincte une fois par match**.
- Mise à jour des tests (counts, validate-replay) et de la fixture
  `montpellier-data.json` pour inclure `coReferee` quand présent.

## 3. Bouton partage

Header à droite, **juste avant le bouton ⚙ configuration** : un bouton 🔗 qui
copie l'URL courante (`window.location.href`, qui contient `?tournament=<slug>`)
dans le presse-papier via `navigator.clipboard.writeText`. Retour visuel
éphémère ("Copié") pour confirmer la copie.

## 4. Déplier les vagues (matches à venir)

`UpcomingMatches.tsx` : par défaut n'affiche que les matches des **2 premières
vagues** (horizons T+1 et T+2). Un bouton toggle **"Déplier" / "Replier"**
révèle ou masque toutes les vagues. Tri inchangé par `startAt`.

## 5. Bug chaînage → tier 4 (le pire)

Une **chaîne** est une équipe qui arbitrerait à T alors qu'elle **joue le match
suivant** (prochain match à T+1), ou qui **vient de jouer** à T−1 et arbitrerait
à T. Ce chaînage arbitrage↔match est interdit et doit être relégué au **pire
tier (4)**.

- `prediction/index.ts` (`suggestForSlot`) : si `next === T+1` OU
  `lastPlayed === T−1` → `tier = 4` (prioritaire, écrase le classement futur).
  Sinon, classement actuel (tier 1 = T+2, tier 2 = [T+1, T+3], tier 3 = sans
  prochain match).
- `types/poloperator.ts` : `tier: 1 | 2 | 3 | 4`.
- `UpcomingMatches.tsx` : `TIER_LABEL[4] = "À éviter"`, `TIER_BG[4] = "bg-red"`.

## 6. Propagations TIER_LABEL

Les nouveaux libellés (1: Optimum, 2: OK, 3: Moins pire) sont déjà en place dans
`UpcomingMatches.tsx`. Aucun autre composant n'affiche les tiers ; on ajoute
seulement le tier 4. Pas d'autre endroit à propager.

## 7. Largeurs UI

- **Header** : full width (suppression du `max-w-3xl` / centrage).
- **Body** : `max-w-5xl` (au lieu de `max-w-3xl`).

## Tests & vérification

- Invariants existants conservés (`pnpm test`), avec mises à jour :
  - test `falls back to the lowest referee count` : C/D jouant à T+1 deviennent
    **tier 4** (plus tier 2) ;
  - comptages `refereeCounts` intégrant les co-arbitres distincts.
- `pnpm run lint`, `pnpm run build`.

## Hors périmètre

- Backend / NestJS.
- Changement de l'ordre des cartes.
- Thème sombre ou autres tokens du kit.
