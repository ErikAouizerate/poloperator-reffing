import type { Match, Slot } from '../../types/poloperator'

export const LIVE_STATUSES: ReadonlySet<string> = new Set([
  'LIVE',
  'ONGOING',
  'IN_PROGRESS',
])

export interface UpcomingWithHorizon {
  match: Match
  horizon: number
}

export interface MatchTimeline {
  live: Match[]
  upcoming: UpcomingWithHorizon[]
}

export function isMatchStarted(match: Match, now: Date): boolean {
  return (
    LIVE_STATUSES.has(match.status) ||
    new Date(match.startAt).getTime() <= now.getTime()
  )
}

/**
 * Split non-finished matches into the current live wave and the upcoming
 * waves, each upcoming match labelled with its chronological wave rank
 * (horizon 1 = next wave to be played, i.e. T+1).
 *
 * A match is "started" when its status is a live status or its startAt has
 * passed (and it is not FINISHED — callers pass non-finished matches). The
 * whole wave containing a started match counts as live.
 */
export function classifyMatches(
  slots: Slot[],
  upcomingMatches: Match[],
  now: Date,
): MatchTimeline {
  const slotIndexByMatchId = new Map<string, number>()
  for (const slot of slots) {
    for (const match of slot.matches) {
      slotIndexByMatchId.set(match.id, slot.index)
    }
  }

  const nonFinished = upcomingMatches.filter((m) => m.status !== 'FINISHED')

  const startedSlots = new Set<number>()
  for (const match of nonFinished) {
    const slotIndex = slotIndexByMatchId.get(match.id)
    if (slotIndex !== undefined && isMatchStarted(match, now)) {
      startedSlots.add(slotIndex)
    }
  }
  const currentWave = startedSlots.size > 0 ? Math.max(...startedSlots) : null

  const upcomingBySlot = new Map<number, Match[]>()
  const live: Match[] = []
  for (const match of nonFinished) {
    const slotIndex = slotIndexByMatchId.get(match.id)
    if (slotIndex === undefined) continue // unslotted: no startAt/teams upstream
    if (slotIndex === currentWave) {
      live.push(match)
    } else {
      const list = upcomingBySlot.get(slotIndex) ?? []
      list.push(match)
      upcomingBySlot.set(slotIndex, list)
    }
  }

  const sortedSlots = [...upcomingBySlot.keys()].sort((a, b) => a - b)
  const rankBySlot = new Map<number, number>()
  sortedSlots.forEach((slotIndex, i) => rankBySlot.set(slotIndex, i + 1))

  const upcoming: UpcomingWithHorizon[] = []
  for (const slotIndex of sortedSlots) {
    const matches = upcomingBySlot.get(slotIndex) ?? []
    matches.sort((a, b) => a.startAt.localeCompare(b.startAt))
    for (const match of matches) {
      upcoming.push({ match, horizon: rankBySlot.get(slotIndex) ?? 1 })
    }
  }

  return { live, upcoming }
}