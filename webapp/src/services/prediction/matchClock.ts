import type { MatchEvent } from '../../types/poloperator'

export interface MatchClock {
  clockSec: number
  paused: boolean
}

/**
 * Rebuild a match's clock from its event log, mirroring poloperator.com:
 * the last START anchors the clock (its `matchClockSec` offset + real time
 * since `createdAt`); a PAUSE/END freezes it on that event's `matchClockSec`.
 */
export function matchClock(events: MatchEvent[], now: Date): MatchClock {
  let frozenSec = 0
  let anchorSec = 0
  let anchorAtMs = 0
  let running = false

  for (const event of events) {
    const atMs = new Date(event.createdAt).getTime()
    if (event.type === 'START') {
      anchorSec = event.matchClockSec
      anchorAtMs = atMs
      running = true
    } else if (event.type === 'PAUSE' || event.type === 'END') {
      frozenSec = event.matchClockSec
      running = false
    }
  }

  if (running && anchorAtMs > 0) {
    const elapsed = Math.floor((now.getTime() - anchorAtMs) / 1000)
    return { clockSec: anchorSec + Math.max(0, elapsed), paused: false }
  }
  return { clockSec: frozenSec, paused: true }
}

export interface Remaining {
  text: string
  overtime: boolean
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Count down `gameDurationMin` minus the match clock; overtime gets a `+`. */
export function formatRemaining(
  clockSec: number,
  gameDurationMin: number,
): Remaining {
  const remainingSec = gameDurationMin * 60 - clockSec
  if (remainingSec < 0) {
    return { text: `+${formatDuration(-remainingSec)}`, overtime: true }
  }
  return { text: formatDuration(remainingSec), overtime: false }
}
