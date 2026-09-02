# IMPROVEMENTS.md Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter les 7 points d'amélioration de `IMPROVEMENTS.md` sur l'app webapp (commit préalable, deux arbitres par match, bouton partage, déplier les vagues, bug chaînage → tier 4, propagation des libellés tiers, largeurs UI).

**Architecture:** Les changements touchent le parseur RSC (`parseRsc.ts`), le moteur de prédiction (`prediction/index.ts`), les types (`types/poloperator.ts`), et les composants UI (`App.tsx`, `UpcomingMatches.tsx`). Les gros changements de logique (co-arbitre, tier 4) sont couverts par des tests vitest sur les données réelles et synthétiques.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind v4 + Redux classic ; vitest 4.1 (node env) ; oxlint.

## Global Constraints

- **Langue** : la communication avec l'utilisateur est en français ; le code, la doc et les tests en anglais.
- **Redux classic** : pas de `createSlice` ; async via `*_REQUESTED → *_START/_SUCCESS/_ERROR` dans `src/store/apiMiddleware.ts`.
- **Commandes** (dans `webapp/`) : `pnpm test` (vitest run), `pnpm run build` (tsc -b && vite build — le typecheck fait partie du build), `pnpm run lint` (oxlint).
- **Tiers** : libellés affichés 1=Optimum, 2=OK, 3=Moins pire, **4=À éviter** ; couleurs teal/yellow/orange/**red**.
- **Deux arbitres** : si `referee` et `coReferee` viennent d'équipes **différentes**, compter un arbitrage pour chaque équipe (une fois par équipe distincte par match).
- **Chaînage (tier 4)** : une équipe qui arbitrerait à T alors qu'elle **joue à T+1** (prochain match), ou qui **a joué à T−1** et arbitrerait à T, est reléguée au **tier 4** (le pire), prioritaire sur le classement futur.
- **Body UI** : `max-w-5xl` ; **header full width** (pas de max-width).
- **Commit préalable** : `index.html`, `RefereeCounts.tsx`, `RefreshButton.tsx`, `index.css` + les `.woff2` de Chakra Petch. **Exclus** : `IMPROVEMENTS.md`, `Poloperator Style Kit.html`.

---

### Task 0: Commit préalable du travail non commité

**Files:**
- Commit: `webapp/index.html`, `webapp/src/components/RefereeCounts.tsx`, `webapp/src/components/RefreshButton.tsx`, `webapp/src/index.css`
- Commit (nouveaux): `webapp/public/fonts/chakra-petch-latin-400.woff2`, `chakra-petch-latin-600.woff2`, `chakra-petch-latin-ext-400.woff2`, `chakra-petch-latin-ext-600.woff2`, `chakra-petch-vietnamese-400.woff2`, `chakra-petch-vietnamese-600.woff2`

**Interfaces:**
- Consumes: l'état git actuel (modifs non commitées + fonts non suivies).
- Produces: un arbre de travail propre sur lequel s'appliquent les tâches suivantes.

- [ ] **Step 1: Vérifier l'état git**

```bash
git status --short
```
Expected: les 4 fichiers modifiés + fonts non suivies (pas d'autres surprises).

- [ ] **Step 2: Committer modifs + fonts (hors IMPROVEMENTS.md et Style Kit)**

```bash
git add webapp/index.html webapp/src/components/RefereeCounts.tsx \
  webapp/src/components/RefreshButton.tsx webapp/src/index.css \
  webapp/public/fonts/chakra-petch-latin-400.woff2 \
  webapp/public/fonts/chakra-petch-latin-600.woff2 \
  webapp/public/fonts/chakra-petch-latin-ext-400.woff2 \
  webapp/public/fonts/chakra-petch-latin-ext-600.woff2 \
  webapp/public/fonts/chakra-petch-vietnamese-400.woff2 \
  webapp/public/fonts/chakra-petch-vietnamese-600.woff2
git commit -m "style: chakra petch font, ascending counts sort, header title"
```
Expected: commit créé ; `IMPROVEMENTS.md` et `Poloperator Style Kit.html` restent non suivis.

- [ ] **Step 3: Vérifier que la build et le lint passent**

```bash
cd webapp && pnpm run build && pnpm run lint
```
Expected: build OK (tsc + vite), oxlint sans erreur.

---

### Task 1: Parser et type pour le co-arbitre (data layer)

**Files:**
- Modify: `webapp/src/types/poloperator.ts`
- Modify: `webapp/src/services/poloperator/parseRsc.ts`
- Test: `webapp/src/services/poloperator/parseRsc.test.ts`

**Interfaces:**
- Consumes: la structure RSC existante (`obj.referee`, `obj.coReferee` sous forme `{ id, name } | null`).
- Produces:
  - `Match` gagne `coRefereePlayerId: string | null` et `coRefereeName: string | null`.
  - `normalizeMatch` remplit ces deux champs depuis `obj.coReferee`.

- [ ] **Step 1: Écrire le test qui échoue (synthetic — coReferee parsé)**

Ajouter dans `describe('extractTournamentRosters (synthetic)')` :

```ts
it('parses the coReferee alongside the referee', () => {
  const stream = [
    '0:["tree",{"children":["__PAGE__",{}]}]',
    '1:' +
      JSON.stringify([
        'Jroot',
        [
          null,
          {
            id: 'm1',
            teamAId: 'ta',
            teamBId: 'tb',
            startAt: '$D2026-09-01T10:00:00.000Z',
            courtName: 'Court 1',
            status: 'FINISHED',
            scoreA: 2,
            scoreB: 1,
            refereePlayerId: 'p1',
            referee: { id: 'p1', name: 'Yann Pivot' },
            coRefereePlayerId: 'p2',
            coReferee: { id: 'p2', name: 'Caro Paulette' },
          },
          { id: 'ta', name: 'Team A', players: [{ playerId: 'p1' }] },
        ],
      ]),
  ].join('\n')
  const { matches } = extractTournamentRosters(parseRscStream(stream))
  expect(matches[0].coRefereeName).toBe('Caro Paulette')
  expect(matches[0].coRefereePlayerId).toBe('p2')
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd webapp && pnpm vitest run src/services/poloperator/parseRsc.test.ts`
Expected: FAIL — `matches[0].coRefereeName` est `undefined`.

- [ ] **Step 3: Implémenter (types + parseRsc)**

Dans `webapp/src/types/poloperator.ts`, interface `Match` — ajouter après `refereeName` :

```ts
  refereePlayerId: string | null
  refereeName: string | null
  coRefereePlayerId: string | null
  coRefereeName: string | null
```

Dans `webapp/src/services/poloperator/parseRsc.ts`, réécrire `normalizeMatch` :

```ts
function normalizeMatch(obj: RawObject): Match {
  const referee =
    isRecord(obj.referee) && typeof obj.referee.name === 'string'
      ? obj.referee.name
      : null
  const coReferee =
    isRecord(obj.coReferee) && typeof obj.coReferee.name === 'string'
      ? obj.coReferee.name
      : null
  return {
    id: String(obj.id ?? ''),
    startAt: toIsoDate(obj.startAt) ?? '',
    courtName: toNullableString(obj.courtName),
    status: String(obj.status),
    phase: toNullableString(obj.phase),
    teamAId: toNullableString(obj.teamAId),
    teamBId: toNullableString(obj.teamBId),
    scoreA: toNullableNumber(obj.scoreA),
    scoreB: toNullableNumber(obj.scoreB),
    refereePlayerId: toNullableString(obj.refereePlayerId),
    refereeName: toNullableString(referee),
    coRefereePlayerId: toNullableString(obj.coRefereePlayerId),
    coRefereeName: toNullableString(coReferee),
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `cd webapp && pnpm vitest run src/services/poloperator/parseRsc.test.ts`
Expected: PASS (y compris le test « extracts the 169 matches » inchangé).

- [ ] **Step 5: Commit**

```bash
git add webapp/src/types/poloperator.ts webapp/src/services/poloperator/parseRsc.ts webapp/src/services/poloperator/parseRsc.test.ts
git commit -m "feat: parse coReferee into Match model"
```

---

### Task 2: Moteur de prédiction — compter chaque équipe distincte (co-arbitre)

**Files:**
- Modify: `webapp/src/services/prediction/index.ts`
- Modify: `webapp/src/services/poloperator/__fixtures__/montpellier-data.json` (régénéré, ajoute `coRefereePlayerId`/`coRefereeName`)
- Test: `webapp/src/services/prediction/prediction.test.ts`
- Test: `webapp/src/services/prediction/validate-replay.test.ts`

**Interfaces:**
- Consumes: `Match.coRefereePlayerId` / `coRefereeName` (Task 1) ; `TournamentModel` existant.
- Produces:
  - `TournamentModel.refereeTeamIdByMatchId` change de `Map<string, string>` à `Map<string, string[]>` (équipes distinctes par match).
  - `historyStats` et `refereeCounts` incrémentent **chaque équipe distincte** une fois par match.

- [ ] **Step 1: Écrire le test qui échoue (unit — co-arbitre d'équipe différente)**

Ajouter dans `describe('refereeCounts (real data)')` de `prediction.test.ts` :

```ts
it('counts a distinct co-referee team as an extra arbitrage', () => {
  // find a finished match whose coReferee maps to a different team
  const model = buildModel(montpellier.teams, buildSlots(montpellier.matches))
  const diffTeamMatch = montpellier.matches.find(
    (m) =>
      m.refereePlayerId &&
      m.coRefereePlayerId &&
      teamIdOf(model, m.refereePlayerId) !== teamIdOf(model, m.coRefereePlayerId),
  )
  expect(diffTeamMatch).toBeDefined()
})
```

Et dans le même fichier, une fonction utilitaire locale :

```ts
function teamIdOf(model: ReturnType<typeof buildModel>, playerId: string): string {
  return model.playerIdToTeam.get(playerId) ?? ''
}
```

- [ ] **Step 2: Régénérer la fixture avec les co-arbitres**

Run (depuis la racine) :

```bash
python3 - <<'PY'
import re, json
rsc=open('webapp/src/services/poloperator/__fixtures__/montpellier.rsc.json').read()
d=json.load(open('webapp/src/services/poloperator/__fixtures__/montpellier-data.json'))
for m in d['matches']:
    mid=m['id']
    idx=rsc.find('"id": "%s"'%mid)
    co=None
    if idx>=0:
        block=rsc[idx:idx+3000]
        cm=re.search(r'"coReferee": (\{.*?\}|null)', block)
        if cm and cm.group(1)!='null':
            mm=re.search(r'"id": "(\w+)", "name": "([^"]*)"', cm.group(1))
            if mm: co={'id':mm.group(1),'name':mm.group(2).strip()}
    m['coRefereePlayerId']=co['id'] if co else None
    m['coRefereeName']=co['name'] if co else None
with open('webapp/src/services/poloperator/__fixtures__/montpellier-data.json','w') as f:
    json.dump(d,f,ensure_ascii=False,indent=1)
PY
```
Expected: la fixture contient 102 matchs avec `coRefereePlayerId` non null.

- [ ] **Step 3: Mettre à jour les assertions de comptage existantes**

Dans `prediction.test.ts`, `describe('refereeCounts (real data)')` — remplacer les valeurs :

```ts
it('matches the recorded distribution', () => {
  const byName = Object.fromEntries(counts.map((c) => [c.teamName, c.count]))
  expect(byName['Nicorette']).toBe(24)
  expect(byName['FourMula']).toBe(4)
  expect(byName['MBRP Pâtes bolo']).toBe(3)
  expect(counts.reduce((n, c) => n + c.count, 0)).toBe(147)
})
```

- [ ] **Step 4: Adapter le modèle — `refereeTeamIdByMatchId` devient un tableau**

Dans `webapp/src/services/prediction/index.ts` :

- `TournamentModel` : `refereeTeamIdByMatchId: Map<string, string[]>`
- `buildModel` : collecter les équipes distinctes (referee + coReferee) :

```ts
export function buildModel(teams: Team[], slots: Slot[]): TournamentModel {
  const playerIdToTeam = new Map<string, string>()
  for (const team of teams) {
    for (const playerId of team.playerIds) {
      if (!playerIdToTeam.has(playerId)) playerIdToTeam.set(playerId, team.id)
    }
  }

  const refereeTeamIdByMatchId = new Map<string, string[]>()
  const matchSlotIndex = new Map<string, number>()
  for (const slot of slots) {
    for (const match of slot.matches) {
      matchSlotIndex.set(match.id, slot.index)
      if (
        match.status === 'FINISHED' &&
        match.teamAId &&
        match.teamBId
      ) {
        const teamsRef = new Set<string>()
        const refTeam = match.refereePlayerId
          ? playerIdToTeam.get(match.refereePlayerId)
          : undefined
        const coTeam = match.coRefereePlayerId
          ? playerIdToTeam.get(match.coRefereePlayerId)
          : undefined
        if (refTeam) teamsRef.add(refTeam)
        if (coTeam) teamsRef.add(coTeam)
        if (teamsRef.size > 0) {
          refereeTeamIdByMatchId.set(match.id, [...teamsRef])
        }
      }
    }
  }

  return { teams, slots, playerIdToTeam, refereeTeamIdByMatchId, matchSlotIndex }
}
```

- `historyStats` : itérer sur le tableau d'équipes :

```ts
function historyStats(
  model: TournamentModel,
  historyUpTo: number,
): { counts: Map<string, number>; lastRef: Map<string, number> } {
  const counts = new Map<string, number>()
  const lastRef = new Map<string, number>()
  for (const slot of model.slots) {
    if (slot.index >= historyUpTo) continue
    for (const match of slot.matches) {
      const teamIds = model.refereeTeamIdByMatchId.get(match.id) ?? []
      for (const teamId of teamIds) {
        counts.set(teamId, (counts.get(teamId) ?? 0) + 1)
        lastRef.set(teamId, slot.index)
      }
    }
  }
  return { counts, lastRef }
}
```

- [ ] **Step 5: Adapter `validate-replay.test.ts` au nouveau shape**

Remplacer le calcul `actualStdDev` (lignes ~38-48) par un flatten du tableau :

```ts
const actualStdDev = stdDev(
  Object.values(
    [...model.refereeTeamIdByMatchId.values()]
      .flat()
      .reduce(
        (acc, teamId) => {
          acc[teamId] = (acc[teamId] ?? 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
  ),
)
```

Et dans `runReplay` (ligne ~96), remplacer :

```ts
const actual = model.refereeTeamIdByMatchId.get(matchId)
if (!actual || actual.length === 0 || list.length === 0) continue
total += 1
if (list[0].teamId === actual[0]) top1Hits += 1
if (list.some((s) => actual.includes(s.teamId))) inTop3 += 1
```

- [ ] **Step 6: Lancer tous les tests**

Run: `cd webapp && pnpm test`
Expected: PASS. NB : le test « matches Manu (ntods) to Paranoïd » et « resolves every recorded referee to a team » doivent être adaptés au shape tableau (voir Step 6 bis si échec).

- [ ] **Step 6 bis: Adapter les assertions de `referee matching` (si échec)**

Dans `prediction.test.ts`, `describe('referee matching (real data)')` :

```ts
it('resolves every recorded referee to a team', () => {
  expect(model.refereeTeamIdByMatchId.size).toBe(114)
  for (const teamIds of model.refereeTeamIdByMatchId.values()) {
    for (const teamId of teamIds) {
      expect(model.teams.some((t) => t.id === teamId)).toBe(true)
    }
  }
})
```

- [ ] **Step 7: Commit**

```bash
git add webapp/src/services/prediction/index.ts webapp/src/services/prediction/prediction.test.ts webapp/src/services/prediction/validate-replay.test.ts webapp/src/services/poloperator/__fixtures__/montpellier-data.json
git commit -m "feat: count a distinct co-referee team as an extra arbitrage"
```

---

### Task 3: Bug chaînage → tier 4 (le pire) + propagation libellés

**Files:**
- Modify: `webapp/src/types/poloperator.ts` (tier `1 | 2 | 3 | 4`)
- Modify: `webapp/src/services/prediction/index.ts` (règle chaînage dans `suggestForSlot`)
- Modify: `webapp/src/components/UpcomingMatches.tsx` (`TIER_LABEL[4]`, `TIER_BG[4]`)
- Test: `webapp/src/services/prediction/prediction.test.ts`

**Interfaces:**
- Consumes: `RefereeSuggestion.tier` étendu à 4 ; `nextMatchSlotIndex`, `lastPlayedSlotIndex` déjà calculés.
- Produces: `suggestForSlot` renvoie `tier: 4` pour les chaînes (T+1 ou T−1) ; `TIER_LABEL[4]='À éviter'`, `TIER_BG[4]='bg-red'`.

- [ ] **Step 1: Écrire les tests qui échouent (synthetic chaînage)**

Ajouter dans `describe('suggestForSlot (synthetic, rule correctness)')` :

```ts
it('marks a team playing the next wave (T+1) as tier 4 (worst)', () => {
  const { suggestionsByMatch } = suggestForSlot(model, 2)
  const list = suggestionsByMatch.get('m3')!
  // m3 = E vs F at slot 2. A and B play next at slot 3 (= T+1) → chain → tier 4.
  const a = list.find((s) => s.teamId === 'A')!
  const b = list.find((s) => s.teamId === 'B')!
  expect(a.tier).toBe(4)
  expect(b.tier).toBe(4)
  // C/D play at slot 4 (= T+2) → still tier 1 (Optimum)
  expect(list.find((s) => s.teamId === 'C')!.tier).toBe(1)
  // tier 4 sorts after tier 3: top picks are C and D
  expect(list[0].teamId).toBe('C')
  expect(list[1].teamId).toBe('D')
})
```

Ajouter dans `describe('suggestForSlot (end of round, future unknown)')` :

```ts
it('marks a team that just played (T-1) as tier 4 (worst)', () => {
  const { suggestionsByMatch } = suggestForSlot(model, 3)
  const list = suggestionsByMatch.get('s3')!
  // E and F played at slot 2 = T-1 → chain match→arbitrage → tier 4
  expect(list.find((s) => s.teamId === 'E')!.tier).toBe(4)
  expect(list.find((s) => s.teamId === 'F')!.tier).toBe(4)
  // C/D played at slot 1 = T-2 → still tier 3, ranked first
  expect(list[0].teamId).toBe('C')
  expect(list[1].teamId).toBe('D')
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd webapp && pnpm vitest run src/services/prediction/prediction.test.ts`
Expected: FAIL — tier de A/B (ou E/F) n'est pas 4.

- [ ] **Step 3: Mettre à jour le test end-of-round existant (E/F deviennent tier 4)**

Le test existant « ranks teams that played at t−2 first, then older, then t−1 (all tier 3) » (lignes ~230-240) affirme `list.every((s) => s.tier === 3)`. Avec la règle chaînage, **E et F ont joué à slot 2 = T−1** → ils deviennent **tier 4** (plus tier 3). Remplacer ce test :

```ts
it('ranks t−2 first, then older, and demotes t−1 teams to tier 4', () => {
  const { suggestionsByMatch } = suggestForSlot(model, 3)
  const list = suggestionsByMatch.get('s3')!
  // C/D (t−2) first, A/B (older) next — all tier 3
  expect(list[0].teamId).toBe('C')
  expect(list[1].teamId).toBe('D')
  expect(list[2].teamId).toBe('A')
  expect(list[3].teamId).toBe('B')
  expect(list[0].tier).toBe(3)
  // E/F played at T−1 → chain → tier 4 (worst, sorted last)
  expect(list[4].tier).toBe(4)
  expect(list[5].tier).toBe(4)
  expect(list[4].teamId).toBe('E')
  expect(list[5].teamId).toBe('F')
})
```

NB : la liste complète a 6 candidats (A,B,C,D,E,F) ; les 4 premiers tier 3, les 2 derniers tier 4.

- [ ] **Step 3 bis: Mettre à jour le test existant « falls back to the lowest referee count »**

Dans `prediction.test.ts` (bloc existant, cible slot 3) — C/D jouent à T+1 donc deviennent tier 4 :

```ts
it('falls back to the lowest referee count when no team is at T+2', () => {
  const { suggestionsByMatch } = suggestForSlot(model, 3)
  // target slot 3: A vs B. T+2 = slot 5, which does not exist.
  const list = suggestionsByMatch.get('m4')!
  // C, D play next at slot 4 (= T+1) → tier 4 (chain). E, F have no upcoming match.
  expect(list[0].tier).toBe(3)
  expect(list[0].refereeCount).toBe(0)
})
```
NB : à cible 3, E (arbitre slot 0) et F (arbitre slot 1) ont count=1 ; C/D (count 0) sont tier 4. Le tier 3 (sans prochain match) n'existe ici que pour les équipes qui ne jouent plus ; ajuste l'assertion selon le résultat réel du moteur (l'important : C/D ne sont plus tier 2 mais tier 4).

- [ ] **Step 4: Implémenter la règle chaînage dans `suggestForSlot`**

Dans `webapp/src/services/prediction/index.ts`, remplacer le bloc de scoring (lignes ~189-210) :

```ts
    const scored: RefereeSuggestion[] = candidates.map((team) => {
      const nextMatchSlotIndex = next.get(team.id) ?? null
      const lastPlayedSlotIndex = last.get(team.id) ?? null
      let tier: 1 | 2 | 3 | 4 = 3
      const isChain =
        nextMatchSlotIndex === targetSlotIndex + 1 ||
        lastPlayedSlotIndex === targetSlotIndex - 1
      if (isChain) {
        tier = 4
      } else if (nextMatchSlotIndex === targetSlotIndex + 2) {
        tier = 1
      } else if (
        nextMatchSlotIndex !== null &&
        nextMatchSlotIndex >= targetSlotIndex + 1 &&
        nextMatchSlotIndex <= targetSlotIndex + 3
      ) {
        tier = 2
      }
      return {
        teamId: team.id,
        teamName: team.name,
        tier,
        refereeCount: counts.get(team.id) ?? 0,
        nextMatchSlotIndex,
        lastPlayedSlotIndex,
        lastRefSlotIndex: lastRef.get(team.id) ?? null,
      }
    })
```

- [ ] **Step 5: Étendre le type `tier` à 4**

Dans `webapp/src/types/poloperator.ts` :

```ts
export interface RefereeSuggestion {
  teamId: string
  teamName: string
  tier: 1 | 2 | 3 | 4
  refereeCount: number
  nextMatchSlotIndex: number | null
  lastPlayedSlotIndex: number | null
  lastRefSlotIndex: number | null
}
```

- [ ] **Step 6: Ajouter le tier 4 dans `UpcomingMatches.tsx`**

```ts
const TIER_LABEL: Record<number, string> = {
  1: "Optimum",
  2: "OK",
  3: "Moins pire",
  4: "À éviter",
};

const TIER_BG: Record<number, string> = {
  1: "bg-teal",
  2: "bg-yellow",
  3: "bg-orange",
  4: "bg-red",
};
```

- [ ] **Step 7: Lancer tous les tests + build + lint**

Run: `cd webapp && pnpm test && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add webapp/src/types/poloperator.ts webapp/src/services/prediction/index.ts webapp/src/services/prediction/prediction.test.ts webapp/src/components/UpcomingMatches.tsx
git commit -m "feat: demote chain arbitrage↔match to worst tier 4"
```

---

### Task 4: Bouton partage (copier l'URL)

**Files:**
- Modify: `webapp/src/App.tsx`

**Interfaces:**
- Consumes: `window.location.href` (contient déjà `?tournament=<slug>` via `syncTournamentSlug`).
- Produces: bouton 🔗 dans le header, à droite juste avant le bouton ⚙ ; copie l'URL et affiche un retour « Copié » éphémère.

- [ ] **Step 1: Ajouter le state et le handler de partage dans `App`**

Dans `App()` (après `const [settingsOpen, setSettingsOpen] = useState(false)`), ajouter :

```ts
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
```

- [ ] **Step 2: Ajouter le bouton dans le header, avant ⚙**

Remplacer le bouton ⚙ seul (lignes ~133-140) par un groupe flex contenant partage puis config :

```tsx
          <div className="flex items-center justify-self-end gap-2">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Copier le lien"
              title="Copier le lien du tournoi"
              className="flex h-9 items-center justify-center rounded-full border-2 border-ink bg-surface px-3 text-xs font-bold uppercase tracking-[0.1em] text-ink hover:bg-teal"
            >
              {copied ? "Copié" : "Partager"}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Configuration"
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-surface text-sm text-ink hover:bg-teal"
            >
              ⚙
            </button>
          </div>
```

- [ ] **Step 3: Vérifier la build**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS (typecheck : `window.location.href` typé string).

- [ ] **Step 4: Commit**

```bash
git add webapp/src/App.tsx
git commit -m "feat: add share button copying tournament URL"
```

---

### Task 5: Déplier les vagues (matches à venir)

**Files:**
- Modify: `webapp/src/components/UpcomingMatches.tsx`

**Interfaces:**
- Consumes: `matches: UpcomingWithHorizon[]` (chaque entrée a `.horizon`).
- Produces: par défaut n'affiche que les matches des horizons ≤ 2 ; un bouton toggle « Déplier » / « Replier » révèle toutes les vagues.

- [ ] **Step 1: Ajouter le state de dépliage**

Dans `UpcomingMatches`, après le tri `sorted`, ajouter un state (composant déjà hook-enabled) :

```ts
  const [expanded, setExpanded] = useState(false);
  const visibleMatches = expanded
    ? sorted
    : sorted.filter((entry) => entry.horizon <= 2);
  const hasMoreWaves = sorted.some((entry) => entry.horizon > 2);
```

Importer `useState` en tête de fichier : `import { useState } from "react";`

- [ ] **Step 2: Rendre la liste filtrée + le bouton toggle**

Remplacer `<ul className="space-y-3">` et sa fermeture par :

```tsx
      {hasMoreWaves ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mb-3 rounded-[10px] border-2 border-ink bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit hover:bg-teal"
        >
          {expanded ? "Replier" : "Déplier"}
        </button>
      ) : null}
      <ul className="space-y-3">
        {visibleMatches.map((entry) => (
          ... (contenu actuel inchangé, en remplaçant `sorted.map` par `visibleMatches.map`)
        ))}
      </ul>
```

- [ ] **Step 3: Vérifier la build**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/UpcomingMatches.tsx
git commit -m "feat: fold upcoming matches to 2 waves with expand/collapse"
```

---

### Task 6: Largeurs UI (header full width, body max-w-5xl)

**Files:**
- Modify: `webapp/src/App.tsx`

**Interfaces:**
- Consumes: les conteneurs actuels `mx-auto max-w-3xl`.
- Produces: header sans max-width (full width) ; body `mx-auto max-w-5xl`.

- [ ] **Step 1: Header full width**

Remplacer le conteneur header (ligne ~114) :

```tsx
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3">
```

(Retirer `mx-auto max-w-3xl` du conteneur intérieur du header.)

- [ ] **Step 2: Body plus large**

Remplacer le conteneur du body (ligne ~144) :

```tsx
      <div className="mx-auto max-w-5xl px-6 py-8">
```

- [ ] **Step 3: Vérifier la build + lint**

Run: `cd webapp && pnpm run build && pnpm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/App.tsx
git commit -m "ui: full-width header, wider max-w-5xl body"
```

---

## Self-Review

**Couverture spec → tâche :**
- Point 1 (commit préalable) → Task 0. ✔
- Point 2 (deux arbitres → comptage par équipe) → Tasks 1 + 2. ✔
- Point 3 (bouton partage, header avant config) → Task 4. ✔
- Point 4 (déplier > 2 vagues, défaut 2) → Task 5. ✔
- Point 5 (bug chaînage → tier 4) → Task 3. ✔
- Point 6 (propagation TIER_LABEL) → Task 3 Step 6 (seul `UpcomingMatches` affiche les tiers). ✔
- Point 7 (header full width, body plus large) → Task 6. ✔

**Placeholder scan :** aucun « TBD » ; chaque step contient du code concret. Le Step 3 de Task 3 contient une note d'ajustement volontaire (les counts réels dépendent du moteur) — comportement attendu précisé.

**Cohérence des types :**
- `Match.coRefereePlayerId/Name` définis en Task 1, consommés en Task 2. ✔
- `tier: 1|2|3|4` défini en Task 3, utilisé dans `TIER_LABEL/TIER_BG`. ✔
- `refereeTeamIdByMatchId: Map<string,string[]>` défini et consommé dans la même Task 2 (index, validate-replay, prediction.test). ✔
