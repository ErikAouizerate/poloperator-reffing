export const CONTINENT_CODES = ['EU', 'NA', 'SA', 'AF', 'AS', 'OC'] as const

export type ContinentCode = (typeof CONTINENT_CODES)[number]

export function isContinentCode(value: unknown): value is ContinentCode {
  return (
    typeof value === 'string' &&
    (CONTINENT_CODES as readonly string[]).includes(value)
  )
}

export interface TournamentSummary {
  id: string
  slug: string
  name: string
  country: string | null
  city: string | null
  dateStart: string | null
  dateEnd: string | null
  format: string | null
  status: string | null
  maxTeams: number | null
  teamCount: number | null
  continentCode: ContinentCode | null
}

export interface Team {
  id: string
  name: string
  playerIds: string[]
  playerNames: string[]
}

export interface MatchEvent {
  type: string
  createdAt: string
  matchClockSec: number
}

export interface Match {
  id: string
  startAt: string
  courtName: string | null
  status: string
  phase: string | null
  teamAId: string | null
  teamBId: string | null
  scoreA: number | null
  scoreB: number | null
  refereePlayerId: string | null
  refereeName: string | null
  coRefereePlayerId: string | null
  coRefereeName: string | null
  events: MatchEvent[]
}

export interface Slot {
  index: number
  startAt: string
  matches: Match[]
}

export interface RefereeSuggestion {
  teamId: string
  teamName: string
  tier: 1 | 2 | 3 | 4
  refereeCount: number
  nextMatchSlotIndex: number | null
  lastPlayedSlotIndex: number | null
  lastRefSlotIndex: number | null
}

export interface RefereeCountEntry {
  teamId: string
  teamName: string
  playerNames: string[]
  count: number
}

export interface TournamentData {
  summary: TournamentSummary
  teams: Team[]
  slots: Slot[]
  upcomingMatches: Match[]
  suggestionsByMatch: Record<string, RefereeSuggestion[]>
  refereeCounts: RefereeCountEntry[]
  gameDurationMin: number
}
