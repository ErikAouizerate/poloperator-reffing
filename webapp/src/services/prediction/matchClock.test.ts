import { describe, expect, it } from 'vitest'
import type { Match, MatchEvent } from '../../types/poloperator'
import { formatRemaining, matchClock, matchElapsedSec } from './matchClock'

function event(
  type: string,
  createdAt: string,
  matchClockSec: number,
): MatchEvent {
  return { type, createdAt, matchClockSec }
}

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    startAt: '2026-09-19T15:24:23.794Z',
    courtName: 'Court 1',
    status: 'SCHEDULED',
    phase: null,
    teamAId: 'a',
    teamBId: 'b',
    scoreA: 0,
    scoreB: 0,
    refereePlayerId: null,
    refereeName: null,
    coRefereePlayerId: null,
    coRefereeName: null,
    events: [],
    ...overrides,
  }
}

const T0 = new Date('2026-09-19T15:24:23.794Z')

describe('matchClock', () => {
  it('is zero and paused without events', () => {
    expect(matchClock([], T0)).toEqual({ clockSec: 0, paused: true })
  })

  it('counts elapsed seconds since the last START', () => {
    const events = [event('START', '2026-09-19T15:24:23.794Z', 0)]
    const now = new Date('2026-09-19T15:24:30.000Z')
    expect(matchClock(events, now)).toEqual({ clockSec: 6, paused: false })
  })

  it('adds the START clock offset when play resumes', () => {
    const events = [
      event('START', '2026-09-19T15:24:23.794Z', 0),
      event('PAUSE', '2026-09-19T15:25:00.000Z', 36),
      event('START', '2026-09-19T15:26:00.000Z', 36),
    ]
    const now = new Date('2026-09-19T15:26:10.000Z')
    expect(matchClock(events, now)).toEqual({ clockSec: 46, paused: false })
  })

  it('freezes on the last PAUSE clock', () => {
    const events = [
      event('START', '2026-09-19T15:24:23.794Z', 0),
      event('PAUSE', '2026-09-19T15:25:00.000Z', 36),
    ]
    const now = new Date('2026-09-19T15:30:00.000Z')
    expect(matchClock(events, now)).toEqual({ clockSec: 36, paused: true })
  })

  it('freezes on the END clock', () => {
    const events = [
      event('START', '2026-09-19T15:24:23.794Z', 0),
      event('END', '2026-09-19T15:35:00.000Z', 636),
    ]
    const now = new Date('2026-09-19T16:00:00.000Z')
    expect(matchClock(events, now)).toEqual({ clockSec: 636, paused: true })
  })
})

describe('matchElapsedSec', () => {
  it('reports zero before the scheduled start, never more than the game duration', () => {
    const m = match({ startAt: '2026-09-19T15:24:23.794Z' })
    const now = new Date('2026-09-19T15:20:00.000Z')
    expect(matchElapsedSec(m, now)).toBe(0)
    expect(formatRemaining(matchElapsedSec(m, now), 10)).toEqual({
      text: '10:00',
      overtime: false,
    })
  })

  it('counts wall-clock elapsed after startAt when no event is available', () => {
    const m = match({ startAt: '2026-09-19T15:24:23.794Z' })
    const now = new Date('2026-09-19T15:25:00.000Z')
    expect(matchElapsedSec(m, now)).toBe(36)
  })

  it('prefers the event clock when events exist, even before startAt', () => {
    const m = match({
      startAt: '2026-09-19T15:24:23.794Z',
      events: [event('START', '2026-09-19T15:23:00.000Z', 0)],
    })
    const now = new Date('2026-09-19T15:23:30.000Z')
    expect(matchElapsedSec(m, now)).toBe(30)
  })

  it('reports zero when startAt is missing or invalid', () => {
    const m = match({ startAt: '' })
    expect(matchElapsedSec(m, T0)).toBe(0)
  })
})

describe('formatRemaining', () => {
  it('counts down the remaining regulation time', () => {
    expect(formatRemaining(0, 10)).toEqual({ text: '10:00', overtime: false })
    expect(formatRemaining(35, 10)).toEqual({ text: '09:25', overtime: false })
    expect(formatRemaining(599, 10)).toEqual({ text: '00:01', overtime: false })
    expect(formatRemaining(600, 10)).toEqual({ text: '00:00', overtime: false })
  })

  it('shows overtime with a leading plus in red', () => {
    expect(formatRemaining(601, 10)).toEqual({ text: '+00:01', overtime: true })
    expect(formatRemaining(725, 10)).toEqual({ text: '+02:05', overtime: true })
  })
})
