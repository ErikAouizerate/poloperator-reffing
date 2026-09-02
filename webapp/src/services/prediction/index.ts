import type {
  Match,
  RefereeCountEntry,
  RefereeSuggestion,
  Slot,
  Team,
} from '../../types/poloperator'
import { buildSlots } from './slots'

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

export interface TournamentModel {
  teams: Team[]
  slots: Slot[]
  playerIdToTeam: Map<string, string>
  /** matchId → teamIds of the recorded referees (finished matches only). */
  refereeTeamIdByMatchId: Map<string, string[]>
  matchSlotIndex: Map<string, number>
}

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

/** Simulated referee history (for replay / what-if scenarios). */
export interface RefereeHistory {
  counts: Map<string, number>
  lastRef: Map<string, number>
}

/** Earliest slot index >= target where each team plays (schedule known ahead). */
function nextMatchSlot(
  model: TournamentModel,
  targetSlotIndex: number,
): Map<string, number> {
  const next = new Map<string, number>()
  for (const slot of model.slots) {
    if (slot.index < targetSlotIndex) continue
    for (const match of slot.matches) {
      if (!match.teamAId || !match.teamBId) continue
      for (const teamId of [match.teamAId, match.teamBId]) {
        if (!next.has(teamId)) next.set(teamId, slot.index)
      }
    }
  }
  return next
}

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

/**
 * Rest group for tier-3 candidates: how far back the team last played relative
 * to the target slot. 0 = played at T-2 (due now, keeps a rest slot), 1 = played
 * earlier (or never), 2 = played at T-1 (just played, no rest). Tiers 1-2 are
 * ordered only by the future-based criteria, so this never applies to them.
 */
export function restGroup(lastPlayed: number | null, targetSlotIndex: number): number {
  if (lastPlayed === targetSlotIndex - 2) return 0
  if (lastPlayed === targetSlotIndex - 1) return 2
  return 1
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

export interface SlotSuggestions {
  suggestionsByMatch: Map<string, RefereeSuggestion[]>
  /** Top pick per match, carried across the slot so parallel matches get distinct refs. */
  usedTeams: Set<string>
}

export function suggestForSlot(
  model: TournamentModel,
  targetSlotIndex: number,
  options?: { skipAssigned?: boolean; history?: RefereeHistory },
): SlotSuggestions {
  const skipAssigned = options?.skipAssigned ?? false
  const targetSlot = model.slots.find((s) => s.index === targetSlotIndex)
  const suggestionsByMatch = new Map<string, RefereeSuggestion[]>()
  if (!targetSlot) return { suggestionsByMatch, usedTeams: new Set() }

  const history = options?.history
  const { counts, lastRef } = history
    ? history
    : historyStats(model, targetSlotIndex)
  const next = nextMatchSlot(model, targetSlotIndex)
  const last = lastPlayedSlot(model, targetSlotIndex)

  const playingTeams = new Set<string>()
  for (const match of targetSlot.matches) {
    if (match.teamAId) playingTeams.add(match.teamAId)
    if (match.teamBId) playingTeams.add(match.teamBId)
  }

  const usedTeams = new Set<string>()
  for (const match of targetSlot.matches) {
    if (!match.teamAId || !match.teamBId) continue
    if (skipAssigned && match.refereePlayerId) continue

    const candidates = model.teams.filter(
      (team) => !playingTeams.has(team.id) && !usedTeams.has(team.id),
    )
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
    scored.sort((x, y) => compareSuggestions(x, y, targetSlotIndex))

    suggestionsByMatch.set(match.id, scored)
    const top = scored[0]
    if (top) usedTeams.add(top.teamId)
  }

  return { suggestionsByMatch, usedTeams }
}

/** Referee counts across the whole tournament (finished matches only). */
export function refereeCounts(
  model: TournamentModel,
): RefereeCountEntry[] {
  const { counts } = historyStats(model, Number.POSITIVE_INFINITY)
  const byTeam = new Map<string, number>()
  for (const team of model.teams) {
    byTeam.set(team.id, counts.get(team.id) ?? 0)
  }
  return [...byTeam.entries()]
    .map(([teamId, count]) => {
      const team = model.teams.find((t) => t.id === teamId)
      return {
        teamId,
        teamName: team?.name ?? teamId,
        playerNames: team?.playerNames ?? [],
        count,
      }
    })
    .sort((a, b) => b.count - a.count || a.teamName.localeCompare(b.teamName))
}

export interface BuildPredictionResult {
  teams: Team[]
  slots: Slot[]
  model: TournamentModel
  upcomingMatches: Match[]
  suggestionsByMatch: Record<string, RefereeSuggestion[]>
  refereeCounts: RefereeCountEntry[]
}

/** Full pipeline: matches+teams → slots, live suggestions, referee counts. */
export function buildPrediction(
  teams: Team[],
  matches: Match[],
): BuildPredictionResult {
  const slots = buildSlots(matches)
  const model = buildModel(teams, slots)

  const upcomingMatches = matches.filter(
    (m) => m.status !== 'FINISHED' && Boolean(m.teamAId && m.teamBId && m.startAt),
  )
  const upcomingSlots = new Set<number>()
  for (const match of upcomingMatches) {
    const slotIndex = model.matchSlotIndex.get(match.id)
    if (slotIndex !== undefined) upcomingSlots.add(slotIndex)
  }

  const suggestionsByMatch: Record<string, RefereeSuggestion[]> = {}
  for (const slotIndex of upcomingSlots) {
    const { suggestionsByMatch: perSlot } = suggestForSlot(model, slotIndex, {
      skipAssigned: true,
    })
    for (const [matchId, list] of perSlot) {
      suggestionsByMatch[matchId] = list
    }
  }

  return {
    teams,
    slots,
    model,
    upcomingMatches,
    suggestionsByMatch,
    refereeCounts: refereeCounts(model),
  }
}