import type { Match, Slot } from '../../types/poloperator'

/**
 * A "créneau" (slot) is a wave of matches running in parallel on the courts.
 * Poloperator schedules courts in staggered waves, so matches of one wave can
 * start a few minutes apart. We cluster matches whose start time falls within
 * `SLOT_TOLERANCE_MINUTES` of the first match of the wave.
 */
export const SLOT_TOLERANCE_MINUTES = 10

export function buildSlots(matches: Match[]): Slot[] {
  const playable = matches
    .filter((m) => Boolean(m.teamAId && m.teamBId && m.startAt))
    .slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  const slots: Slot[] = []
  let current: Match[] = []
  let slotStart = ''

  for (const match of playable) {
    if (current.length === 0) {
      current = [match]
      slotStart = match.startAt
      continue
    }
    const gapMs =
      new Date(match.startAt).getTime() - new Date(slotStart).getTime()
    if (gapMs > SLOT_TOLERANCE_MINUTES * 60_000) {
      slots.push(createSlot(slots.length, current))
      current = [match]
      slotStart = match.startAt
    } else {
      current.push(match)
    }
  }
  if (current.length > 0) slots.push(createSlot(slots.length, current))
  return slots
}

function createSlot(index: number, matches: Match[]): Slot {
  return {
    index,
    startAt: matches[0].startAt,
    matches: matches.slice().sort((a, b) => {
      if (a.courtName && b.courtName && a.courtName !== b.courtName) {
        return a.courtName.localeCompare(b.courtName)
      }
      return a.startAt.localeCompare(b.startAt)
    }),
  }
}