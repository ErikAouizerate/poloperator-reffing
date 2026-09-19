import type { Match, Team, TournamentSummary } from '../../types/poloperator'
import { isContinentCode } from '../../types/poloperator'

/**
 * Poloperator is a Next.js App Router site: its pages return React Server
 * Component "flight" data — a stream of lines, each `ref:json`, where the
 * payload may be nested inside a single large chunk. This module extracts the
 * domain data (tournaments, teams, matches) by walking the parsed trees and
 * matching objects by shape, instead of relying on chunk indices.
 */

export type RscValue = unknown

/** Parse an RSC flight stream into the array of chunk values (best effort). */
export function parseRscStream(text: string): RscValue[] {
  const values: RscValue[] = []
  for (const line of text.split('\n')) {
    if (!line) continue
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const body = line.slice(colon + 1)
    try {
      values.push(JSON.parse(body))
    } catch {
      // Non-JSON chunk bodies (e.g. `I[...]` module references) are ignored.
    }
  }
  return values
}

/** RSC serializes dates as `$D<ISO>`. Normalize to a plain ISO string. */
export function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (value.startsWith('$D')) return value.slice(2) || null
  if (value.startsWith('$')) return null
  return value || null
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

interface RawObject {
  [key: string]: unknown
}

function isRecord(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function walkAll(
  values: RscValue[],
  visit: (obj: RawObject) => void,
): void {
  const stack: unknown[] = [...values]
  while (stack.length > 0) {
    const node = stack.pop()
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item)
    } else if (isRecord(node)) {
      visit(node)
      for (const key of Object.keys(node)) stack.push(node[key])
    }
  }
}

function isMatchShape(obj: RawObject): boolean {
  return (
    'teamAId' in obj &&
    'teamBId' in obj &&
    typeof obj.startAt === 'string' &&
    typeof obj.courtName === 'string' &&
    typeof obj.status === 'string' &&
    'scoreA' in obj
  )
}

function isTeamShape(obj: RawObject): boolean {
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.players)
  )
}

/** A tournament team on the waiting list is not selected (`selected: false`). */
function isParticipatingTeam(obj: RawObject): boolean {
  return obj.selected !== false
}

function isTournamentShape(obj: RawObject): boolean {
  return (
    typeof obj.slug === 'string' &&
    typeof obj.name === 'string' &&
    'dateStart' in obj &&
    ('teamCount' in obj || 'status' in obj)
  )
}

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

function normalizeTeam(obj: RawObject): Team {
  // Collect { id, name } pairs so playerIds and playerNames stay index-aligned:
  // an entry with no usable id is dropped entirely, never just its name.
  const players: { id: string; name: string }[] = []
  for (const entry of obj.players as unknown[]) {
    if (!isRecord(entry)) continue
    const id =
      typeof entry.playerId === 'string'
        ? entry.playerId
        : typeof entry.id === 'string'
          ? entry.id
          : null
    if (!id) continue
    // The roster entry embeds the full player object; the display name lives on it.
    const name =
      isRecord(entry.player) && typeof entry.player.name === 'string'
        ? entry.player.name.trim()
        : ''
    players.push({ id, name })
  }
  return {
    id: String(obj.id),
    name: String(obj.name).trim(),
    playerIds: players.map((p) => p.id),
    playerNames: players.map((p) => p.name),
  }
}

function normalizeTournament(obj: RawObject): TournamentSummary {
  return {
    id: String(obj.id ?? obj.slug),
    slug: String(obj.slug),
    name: String(obj.name),
    country: toNullableString(obj.country),
    city: toNullableString(obj.city),
    dateStart: toIsoDate(obj.dateStart),
    dateEnd: toIsoDate(obj.dateEnd),
    format: toNullableString(obj.format),
    status: toNullableString(obj.status),
    maxTeams: toNullableNumber(obj.maxTeams),
    teamCount: toNullableNumber(obj.teamCount),
    continentCode: isContinentCode(obj.continentCode) ? obj.continentCode : null,
  }
}

/** Extract the tournament list from a `/fr/tournaments` RSC payload. */
export function extractTournaments(values: RscValue[]): TournamentSummary[] {
  const byId = new Map<string, TournamentSummary>()
  walkAll(values, (obj) => {
    if (!isTournamentShape(obj)) return
    const t = normalizeTournament(obj)
    if (!byId.has(t.id)) byId.set(t.id, t)
  })
  return [...byId.values()]
}

export interface TournamentRosters {
  teams: Team[]
  matches: Match[]
}

/** Extract teams (with rosters) and matches from a tournament page payload. */
export function extractTournamentRosters(
  values: RscValue[],
): TournamentRosters {
  const teamsById = new Map<string, Team>()
  const matchesById = new Map<string, Match>()
  walkAll(values, (obj) => {
    if (isTeamShape(obj)) {
      if (!isParticipatingTeam(obj)) return
      const team = normalizeTeam(obj)
      if (!teamsById.has(team.id)) teamsById.set(team.id, team)
    } else if (isMatchShape(obj)) {
      const match = normalizeMatch(obj)
      if (match.id && !matchesById.has(match.id)) matchesById.set(match.id, match)
    }
  })
  return { teams: [...teamsById.values()], matches: [...matchesById.values()] }
}