import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Match, Team } from '../../types/poloperator'
import {
  buildModel,
  buildPrediction,
  refereeCounts,
  restGroup,
  suggestForSlot,
} from './index'
import { buildSlots } from './slots'

const fixture = (name: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`../poloperator/__fixtures__/${name}`, import.meta.url)), 'utf8'),
  )

interface FixtureData {
  teams: Team[]
  matches: Match[]
}

const montpellier = fixture('montpellier-data.json') as FixtureData

function teamIdOf(model: ReturnType<typeof buildModel>, playerId: string): string {
  return model.playerIdToTeam.get(playerId) ?? ''
}

describe('slotting (real data)', () => {
  const slots = buildSlots(montpellier.matches)

  it('groups playable matches into ordered waves', () => {
    const playable = montpellier.matches.filter(
      (m) => m.teamAId && m.teamBId && m.startAt,
    )
    const slotted = slots.reduce((n, s) => n + s.matches.length, 0)
    expect(slotted).toBe(playable.length)
    expect(slotted).toBe(169 - 15) // 15 forfeit matches have a null team
  })

  it('starts with the first wave and is chronologically ordered', () => {
    expect(slots[0].matches).toHaveLength(3)
    for (let i = 1; i < slots.length; i += 1) {
      expect(slots[i].startAt >= slots[i - 1].startAt).toBe(true)
    }
  })

  it('keeps slot indexes dense and contiguous', () => {
    expect(slots.map((s) => s.index)).toEqual(slots.map((_, i) => i))
  })
})

describe('referee matching (real data)', () => {
  const model = buildModel(montpellier.teams, buildSlots(montpellier.matches))

  it('resolves every recorded referee to a team', () => {
    expect(model.refereeTeamIdByMatchId.size).toBe(114)
    for (const teamIds of model.refereeTeamIdByMatchId.values()) {
      for (const teamId of teamIds) {
        expect(model.teams.some((t) => t.id === teamId)).toBe(true)
      }
    }
  })

  it('matches Manu (ntods) to Paranoïd', () => {
    const paranoia = montpellier.teams.find((t) => t.name === 'Paranoïd')!
    const manuMatch = montpellier.matches.find((m) => m.refereeName === 'Manu (ntods)')!
    expect(model.refereeTeamIdByMatchId.get(manuMatch.id)).toContain(paranoia.id)
  })
})

describe('refereeCounts (real data)', () => {
  const model = buildModel(montpellier.teams, buildSlots(montpellier.matches))
  const counts = refereeCounts(model)

  it('counts a distinct co-referee team as an extra arbitrage', () => {
    const diffTeamMatch = montpellier.matches.find(
      (m) =>
        m.refereePlayerId &&
        m.coRefereePlayerId &&
        teamIdOf(model, m.refereePlayerId) !== teamIdOf(model, m.coRefereePlayerId),
    )
    expect(diffTeamMatch).toBeDefined()
  })

  it('matches the recorded distribution', () => {
    const byName = Object.fromEntries(counts.map((c) => [c.teamName, c.count]))
    expect(byName['Nicorette']).toBe(24)
    expect(byName['FourMula']).toBe(4)
    expect(byName['MBRP Pâtes bolo']).toBe(3)
    expect(counts.reduce((n, c) => n + c.count, 0)).toBe(147)
  })

  it('includes every team, sorted by count desc', () => {
    expect(counts).toHaveLength(19)
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i - 1].count >= counts[i].count).toBe(true)
    }
  })
})

describe('suggestForSlot (real data, invariants)', () => {
  const slots = buildSlots(montpellier.matches)
  const model = buildModel(montpellier.teams, slots)
  const target = 2 // third wave: history = waves 0-1

  const { suggestionsByMatch, usedTeams } = suggestForSlot(model, target)
  const match = slots[target].matches[0]
  const suggestions = suggestionsByMatch.get(match.id)!

  it('produces an ordered list excluding the playing teams', () => {
    const playing = new Set<string>()
    for (const m of slots[target].matches) {
      if (m.teamAId) playing.add(m.teamAId)
      if (m.teamBId) playing.add(m.teamBId)
    }
    // first match of the slot: no pick consumed yet, so 19 − playing teams
    expect(suggestions.length).toBe(19 - playing.size)
    for (const s of suggestions) expect(playing.has(s.teamId)).toBe(false)
  })

  it('sorts by tier then referee count, breaking tier-3 ties by rest group', () => {
    for (let i = 1; i < suggestions.length; i += 1) {
      const prev = suggestions[i - 1]
      const cur = suggestions[i]
      expect(cur.tier >= prev.tier).toBe(true)
      if (cur.tier !== prev.tier) continue
      expect(cur.refereeCount >= prev.refereeCount).toBe(true)
      if (cur.refereeCount !== prev.refereeCount) continue
      if (cur.tier !== 3) continue
      const prevGroup = restGroup(prev.lastPlayedSlotIndex, target)
      const curGroup = restGroup(cur.lastPlayedSlotIndex, target)
      expect(curGroup >= prevGroup).toBe(true)
    }
  })

  it('gives distinct top picks across matches of the same slot', () => {
    expect(usedTeams.size).toBe(slots[target].matches.length)
  })
})

describe('suggestForSlot (synthetic, rule correctness)', () => {
  const players = (teamId: string) => [
    { playerId: `${teamId}-p1` },
    { playerId: `${teamId}-p2` },
  ]
  const teams: Team[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(
    (name) => ({
      id: name,
      name,
      playerIds: players(name).map((p) => p.playerId),
      playerNames: [],
    }),
  )

  const matches: Match[] = [
    // slot 0 (T-2): G vs H — filler history
    m(0, 'm0', 'G', 'H', null),
    // slot 1 (T-1): C vs I — C plays the previous wave
    m(1, 'm1', 'C', 'I', null),
    // slot 2 (T): E vs F — the wave to predict (target)
    m(2, 'm2', 'E', 'F', null),
    // slot 3 (T+1): A vs G — A plays the very next wave
    m(3, 'm3', 'A', 'G', null),
    // slot 4 (T+2): B vs H — B plays two waves later (Optimum)
    m(4, 'm4', 'B', 'H', null),
    // slot 5 (T+3): D vs I — D plays three waves later (OK)
    m(5, 'm5', 'D', 'I', null),
  ]

  function m(slot: number, id: string, a: string, b: string, refOf: string | null): Match {
    return {
      id,
      startAt: `2026-09-01T0${slot}:00:00.000Z`,
      courtName: 'Court 1',
      status: slot < 2 ? 'FINISHED' : 'SCHEDULED',
      phase: 'STAGE',
      teamAId: a,
      teamBId: b,
      scoreA: null,
      scoreB: null,
      refereePlayerId: refOf ? `${refOf}-p1` : null,
      refereeName: refOf ? `ref-of-${refOf}` : null,
      coRefereePlayerId: null,
      coRefereeName: null,
      events: [],
    }
  }

  const slots = buildSlots(matches)
  const model = buildModel(teams, slots)

  it('ranks a T+2 team as tier 1 (Optimum)', () => {
    const { suggestionsByMatch } = suggestForSlot(model, 2)
    const list = suggestionsByMatch.get('m2')!
    // B plays at slot 4 = T+2 and has not just played → tier 1
    expect(list.find((s) => s.teamId === 'B')!.tier).toBe(1)
    expect(list[0].tier).toBe(1)
    expect(list[0].teamId).toBe('B')
  })

  it('ranks a T+3 team as tier 2 (OK)', () => {
    const { suggestionsByMatch } = suggestForSlot(model, 2)
    const list = suggestionsByMatch.get('m2')!
    // D plays at slot 5 = T+3 → tier 2
    expect(list.find((s) => s.teamId === 'D')!.tier).toBe(2)
  })

  it('ranks a never-playing team as tier 3', () => {
    const { suggestionsByMatch } = suggestForSlot(model, 2)
    const list = suggestionsByMatch.get('m2')!
    // J never plays → tier 3 (fallback)
    expect(list.find((s) => s.teamId === 'J')!.tier).toBe(3)
  })

  it('demotes a team playing the next wave (T+1) to tier 4 (chain)', () => {
    const { suggestionsByMatch } = suggestForSlot(model, 2)
    const list = suggestionsByMatch.get('m2')!
    // A plays at slot 3 = T+1 → arbitrage→match chain → tier 4 (worst)
    expect(list.find((s) => s.teamId === 'A')!.tier).toBe(4)
  })

  it('demotes a team that just played (T-1) to tier 4 (chain)', () => {
    const { suggestionsByMatch } = suggestForSlot(model, 2)
    const list = suggestionsByMatch.get('m2')!
    // C played at slot 1 = T-1 → match→arbitrage chain → tier 4 (worst)
    expect(list.find((s) => s.teamId === 'C')!.tier).toBe(4)
  })

  it('sorts tiers ascending and puts chain (4) last', () => {
    const { suggestionsByMatch } = suggestForSlot(model, 2)
    const list = suggestionsByMatch.get('m2')!
    // candidates not playing E,F: A,B,C,D,G,H,I,J
    expect(list).toHaveLength(8)
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i].tier >= list[i - 1].tier).toBe(true)
    }
    expect(list[list.length - 1].tier).toBe(4)
  })

  it('buildPrediction exposes live suggestions only for scheduled matches', () => {
    const result = buildPrediction(teams, matches)
    expect(result.upcomingMatches.map((m) => m.id).sort()).toEqual(['m2', 'm3', 'm4', 'm5'])
    expect(Object.keys(result.suggestionsByMatch).sort()).toEqual(['m2', 'm3', 'm4', 'm5'])
  })

  it('still suggests referees for a scheduled match that already has one assigned', () => {
    const withReferee = matches.map((x) =>
      x.id === 'm2'
        ? { ...x, refereePlayerId: 'A-p1', refereeName: 'ref-A' }
        : x,
    )
    const result = buildPrediction(teams, withReferee)
    expect(result.suggestionsByMatch['m2']).toBeDefined()
    expect(result.suggestionsByMatch['m2'].length).toBeGreaterThan(0)
  })
})

describe('suggestForSlot (end of round, future unknown)', () => {
  const teams: Team[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((name) => ({
    id: name,
    name,
    playerIds: [`${name}-p1`, `${name}-p2`],
    playerNames: [`Player ${name}`],
  }))

  const matches: Match[] = [
    m(0, 's0', 'A', 'B', null),
    m(1, 's1', 'C', 'D', null),
    m(2, 's2', 'E', 'F', null),
    m(3, 's3', 'G', 'H', null),
  ]

  function m(slot: number, id: string, a: string, b: string, refOf: string | null): Match {
    return {
      id,
      startAt: `2026-09-02T0${slot}:00:00.000Z`,
      courtName: 'Court 1',
      status: slot === 3 ? 'SCHEDULED' : 'FINISHED',
      phase: 'STAGE',
      teamAId: a,
      teamBId: b,
      scoreA: null,
      scoreB: null,
      refereePlayerId: refOf ? `${refOf}-p1` : null,
      refereeName: refOf ? `ref-of-${refOf}` : null,
      coRefereePlayerId: null,
      coRefereeName: null,
      events: [],
    }
  }

  const slots = buildSlots(matches)
  const model = buildModel(teams, slots)

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

  it('ranks fewest referee duties first, across rest groups', () => {
    const refs = matches.map((x) =>
      x.id === 's2' ? { ...x, refereePlayerId: 'D-p1', refereeName: 'ref-D' } : x,
    )
    const model2 = buildModel(teams, buildSlots(refs))
    const { suggestionsByMatch } = suggestForSlot(model2, 3)
    const list = suggestionsByMatch.get('s3')!
    // D (t−2, 1 duty) is pushed behind every 0-duty team even though it is due
    // to referee by rest group; C (t−2, 0 duty) still leads the t−2 group.
    const order = list.map((s) => s.teamId)
    expect(order[0]).toBe('C')
    expect(order.indexOf('D')).toBeGreaterThan(order.indexOf('A'))
    expect(order.indexOf('D')).toBeGreaterThan(order.indexOf('B'))
  })
})
