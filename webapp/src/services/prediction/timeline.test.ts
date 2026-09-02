import { describe, expect, it } from 'vitest'
import type { Match, Slot } from '../../types/poloperator'
import { classifyMatches } from './timeline'

function makeMatch(
  id: string,
  startAt: string,
  overrides: Partial<Match> = {},
): Match {
  return {
    id,
    startAt,
    courtName: 'Court 1',
    status: 'SCHEDULED',
    phase: null,
    teamAId: 'a',
    teamBId: 'b',
    scoreA: null,
    scoreB: null,
    refereePlayerId: null,
    refereeName: null,
    ...overrides,
  }
}

function makeSlots(...groups: Match[][]): Slot[] {
  return groups.map((matches, index) => ({
    index,
    startAt: matches[0].startAt,
    matches,
  }))
}

const NOW = new Date('2026-09-05T10:00:00.000Z')

describe('classifyMatches', () => {
  it('treats a match with a live status as started', () => {
    const live = makeMatch('m1', '2026-09-05T11:00:00.000Z', {
      status: 'LIVE',
    })
    const slots = makeSlots([live])
    const { live: liveMatches, upcoming } = classifyMatches(slots, [live], NOW)
    expect(liveMatches.map((m) => m.id)).toEqual(['m1'])
    expect(upcoming).toEqual([])
  })

  it('treats a scheduled match whose startAt is in the past as started', () => {
    const started = makeMatch('m2', '2026-09-05T09:45:00.000Z')
    const slots = makeSlots([started])
    const { live, upcoming } = classifyMatches(slots, [started], NOW)
    expect(live.map((m) => m.id)).toEqual(['m2'])
    expect(upcoming).toEqual([])
  })

  it('marks the whole current wave as live, including not-yet-started matches', () => {
    const m1 = makeMatch('m1', '2026-09-05T11:00:00.000Z', { status: 'LIVE' })
    const m2 = makeMatch('m2', '2026-09-05T11:05:00.000Z')
    const slots = makeSlots([m1, m2])
    const { live } = classifyMatches(slots, [m1, m2], NOW)
    expect(live.map((m) => m.id).sort()).toEqual(['m1', 'm2'])
  })

  it('labels upcoming waves with their chronological horizon', () => {
    const m1 = makeMatch('m1', '2026-09-05T11:00:00.000Z', { status: 'LIVE' })
    const t1 = makeMatch('t1', '2026-09-05T12:00:00.000Z')
    const t2 = makeMatch('t2', '2026-09-05T13:00:00.000Z')
    const slots = makeSlots([m1], [t1], [t2])
    const { live, upcoming } = classifyMatches(slots, [m1, t1, t2], NOW)
    expect(live.map((m) => m.id)).toEqual(['m1'])
    expect(upcoming.map((u) => [u.match.id, u.horizon])).toEqual([
      ['t1', 1],
      ['t2', 2],
    ])
  })

  it('ranks T+1 from the first upcoming wave when nothing is live', () => {
    const t1 = makeMatch('t1', '2026-09-05T12:00:00.000Z')
    const t2 = makeMatch('t2', '2026-09-05T13:00:00.000Z')
    const slots = makeSlots([t1], [t2])
    const { live, upcoming } = classifyMatches(slots, [t1, t2], NOW)
    expect(live).toEqual([])
    expect(upcoming.map((u) => [u.match.id, u.horizon])).toEqual([
      ['t1', 1],
      ['t2', 2],
    ])
  })

  it('never includes finished matches', () => {
    const done = makeMatch('done', '2026-09-05T09:00:00.000Z', {
      status: 'FINISHED',
    })
    const slots = makeSlots([done])
    const { live, upcoming } = classifyMatches(slots, [done], NOW)
    expect(live).toEqual([])
    expect(upcoming).toEqual([])
  })
})