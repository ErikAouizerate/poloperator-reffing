import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Match, Team } from '../../types/poloperator'
import { buildModel, suggestForSlot } from './index'
import { buildSlots } from './slots'

interface FixtureData {
  teams: Team[]
  matches: Match[]
}

const data = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../poloperator/__fixtures__/montpellier-data.json', import.meta.url),
    ),
    'utf8',
  ),
) as FixtureData

/**
 * Dry-run on the finished Montpellier tournament: at each wave we "predict"
 * the referees using only the waves that came before, and compare with the
 * referees that were actually recorded.
 *
 * The real tournament was NOT balanced (Nicorette refereed 18 times, FourMula
 * once) — humans picked ad hoc. The value of the dry-run is therefore not
 * "match reality" but: (1) the mechanics stay sound at every wave, and (2)
 * following the suggestions would produce a far more balanced rotation.
 */
describe('replay validation (real data)', () => {
  const slots = buildSlots(data.matches)
  const model = buildModel(data.teams, slots)

  const replay = runReplay(model, slots.length)
  const simulation = simulate(model, slots.length)
  const actualStdDev = stdDev(
    Object.values(
      [...model.refereeTeamIdByMatchId.values()].reduce(
        (acc, teamId) => {
          acc[teamId] = (acc[teamId] ?? 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    ),
  )

  console.log(
    `replay: compared=${replay.total} top-1=${replay.top1Hits}` +
      ` (${(100 * replay.top1Rate).toFixed(1)}%) in-top3=${replay.inTop3}`,
  )
  console.log(
    `balance: actual max=18 σ=${actualStdDev.toFixed(1)} vs suggested ` +
      `[${simulation.min}..${simulation.max}] σ=${simulation.stdDev.toFixed(1)}`,
  )

  it('replays every wave without crashing and keeps picks distinct', () => {
    expect(replay.total).toBeGreaterThanOrEqual(100)
    expect(replay.badSlots).toBe(0)
  })

  it('suggestions exclude the playing teams of their wave', () => {
    for (let t = 1; t < slots.length; t += 1) {
      const playing = new Set<string>()
      for (const m of slots[t].matches) {
        if (m.teamAId) playing.add(m.teamAId)
        if (m.teamBId) playing.add(m.teamBId)
      }
      const { suggestionsByMatch } = suggestForSlot(model, t)
      for (const list of suggestionsByMatch.values()) {
        for (const s of list) expect(playing.has(s.teamId)).toBe(false)
      }
    }
  })

  it('following the suggestions would balance referee duties far better than reality', () => {
    // actual spread is ~[1..18]; a balanced rotation should be much tighter
    expect(simulation.stdDev).toBeLessThan(actualStdDev * 0.5)
    expect(simulation.max - simulation.min).toBeLessThanOrEqual(3)
    expect(simulation.max).toBeLessThan(18)
  })
})

function runReplay(model: ReturnType<typeof buildModel>, slotCount: number) {
  let total = 0
  let top1Hits = 0
  let inTop3 = 0
  let badSlots = 0
  for (let t = 1; t < slotCount; t += 1) {
    const { suggestionsByMatch, usedTeams } = suggestForSlot(model, t)
    const distinct = suggestionsByMatch.size
    if (distinct !== usedTeams.size) badSlots += 1
    for (const [matchId, list] of suggestionsByMatch) {
      const actual = model.refereeTeamIdByMatchId.get(matchId)
      if (!actual || list.length === 0) continue
      total += 1
      if (list[0].teamId === actual) top1Hits += 1
      if (list.some((s) => s.teamId === actual)) inTop3 += 1
    }
  }
  return {
    total,
    top1Hits,
    inTop3,
    badSlots,
    top1Rate: total > 0 ? top1Hits / total : 0,
  }
}

/** Assign the top suggestion to every match in every wave, feeding the
 *  simulated assignments back into the ranking (as a live organizer would). */
function simulate(model: ReturnType<typeof buildModel>, slotCount: number) {
  const counts = new Map<string, number>()
  const lastRef = new Map<string, number>()
  for (let t = 0; t < slotCount; t += 1) {
    const { suggestionsByMatch } = suggestForSlot(model, t, {
      history: { counts, lastRef },
    })
    for (const list of suggestionsByMatch.values()) {
      const teamId = list[0]?.teamId
      if (!teamId) continue
      counts.set(teamId, (counts.get(teamId) ?? 0) + 1)
      lastRef.set(teamId, t)
    }
  }
  const allCounts = model.teams.map((t) => counts.get(t.id) ?? 0)
  return {
    stdDev: stdDev(allCounts),
    max: Math.max(...allCounts),
    min: Math.min(...allCounts),
  }
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}