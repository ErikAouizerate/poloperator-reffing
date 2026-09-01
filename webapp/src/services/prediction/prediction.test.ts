import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Match, Team } from '../../types/poloperator'
import {
  buildModel,
  buildPrediction,
  refereeCounts,
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
    for (const teamId of model.refereeTeamIdByMatchId.values()) {
      expect(model.teams.some((t) => t.id === teamId)).toBe(true)
    }
  })

  it('matches Manu (ntods) to Paranoïd', () => {
    const paranoia = montpellier.teams.find((t) => t.name === 'Paranoïd')!
    const manuMatch = montpellier.matches.find((m) => m.refereeName === 'Manu (ntods)')!
    expect(model.refereeTeamIdByMatchId.get(manuMatch.id)).toBe(paranoia.id)
  })
})

describe('refereeCounts (real data)', () => {
  const model = buildModel(montpellier.teams, buildSlots(montpellier.matches))
  const counts = refereeCounts(model)

  it('matches the recorded distribution', () => {
    const byName = Object.fromEntries(counts.map((c) => [c.teamName, c.count]))
    expect(byName['Nicorette']).toBe(18)
    expect(byName['FourMula']).toBe(1)
    expect(byName['MBRP Pâtes bolo']).toBe(1)
    expect(counts.reduce((n, c) => n + c.count, 0)).toBe(114)
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

  it('sorts by tier then referee count', () => {
    for (let i = 1; i < suggestions.length; i += 1) {
      const prev = suggestions[i - 1]
      const cur = suggestions[i]
      expect(cur.tier >= prev.tier).toBe(true)
      if (cur.tier === prev.tier) expect(cur.refereeCount >= prev.refereeCount).toBe(true)
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
  const teams: Team[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => ({
    id: name,
    name,
    playerIds: players(name).map((p) => p.playerId),
  }))

  const matches: Match[] = [
    // slot 0: A vs B, refereed by E
    m(0, 'm1', 'A', 'B', 'E'),
    // slot 1: C vs D, refereed by F
    m(1, 'm2', 'C', 'D', 'F'),
    // slot 2: E vs F (the wave to predict)
    m(2, 'm3', 'E', 'F', null),
    // slot 3: A vs B again
    m(3, 'm4', 'A', 'B', null),
    // slot 4: C vs D again
    m(4, 'm5', 'C', 'D', null),
  ]

  function m(slot: number, id: string, a: string, b: string, refOf: string | null): Match {
    return {
      id,
      startAt: `2026-09-01T0${slot}:00:00.000Z`,
      courtName: 'Court 1',
      status: refOf ? 'FINISHED' : 'SCHEDULED',
      phase: 'STAGE',
      teamAId: a,
      teamBId: b,
      scoreA: null,
      scoreB: null,
      refereePlayerId: refOf ? `${refOf}-p1` : null,
      refereeName: refOf ? `ref-of-${refOf}` : null,
    }
  }

  const slots = buildSlots(matches)
  const model = buildModel(teams, slots)

  it('prefers the teams that play exactly two waves later (T+2)', () => {
    const { suggestionsByMatch } = suggestForSlot(model, 2)
    const list = suggestionsByMatch.get('m3')!
    expect(list[0].tier).toBe(1)
    expect(list[0].teamId).toBe('C') // next match at slot 4 = target+2, count 0
    expect(list[1].teamId).toBe('D')
  })

  it('falls back to the lowest referee count when no team is at T+2', () => {
    const { suggestionsByMatch } = suggestForSlot(model, 3)
    // target slot 3: A vs B. T+2 = slot 5, which does not exist.
    const list = suggestionsByMatch.get('m4')!
    expect(list[0].tier).toBe(2)
    // candidates not playing: C, D (next 4 = target+1), E, F (no upcoming match)
    // E refereed at slot 0, F at slot 1 → counts E=1, F=1, C=0, D=0
    expect(list[0].refereeCount).toBe(0)
  })

  it('buildPrediction exposes live suggestions only for scheduled matches', () => {
    const result = buildPrediction(teams, matches)
    expect(result.upcomingMatches.map((m) => m.id).sort()).toEqual(['m3', 'm4', 'm5'])
    expect(Object.keys(result.suggestionsByMatch).sort()).toEqual(['m3', 'm4', 'm5'])
  })
})