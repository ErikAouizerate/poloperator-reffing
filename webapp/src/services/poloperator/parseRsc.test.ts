import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  extractTournamentRosters,
  extractTournaments,
  parseRscStream,
  toIsoDate,
} from './parseRsc'

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), 'utf8')

describe('toIsoDate', () => {
  it('strips the RSC $D date marker', () => {
    expect(toIsoDate('$D2026-08-28T06:30:00.000Z')).toBe('2026-08-28T06:30:00.000Z')
    expect(toIsoDate(null)).toBeNull()
    expect(toIsoDate('$undefined')).toBeNull()
  })
})

describe('parseRscStream', () => {
  it('parses JSON chunk bodies and skips module references', () => {
    const values = parseRscStream(
      '0:["hello",{"a":1}]\n3:I[6423,[],""]\n5:{"slug":"x","name":"X"}\n',
    )
    expect(values).toHaveLength(2)
    expect(values[0]).toEqual(['hello', { a: 1 }])
    expect(values[1]).toEqual({ slug: 'x', name: 'X' })
  })
})

describe('extractTournaments (real payload)', () => {
  const tournaments = extractTournaments(parseRscStream(fixture('tournaments.rsc.json')))

  it('extracts a large tournament list with unique ids', () => {
    expect(tournaments.length).toBeGreaterThanOrEqual(80)
    const ids = new Set(tournaments.map((t) => t.id))
    expect(ids.size).toBe(tournaments.length)
  })

  it('normalizes the montpellier tournament', () => {
    const montpellier = tournaments.find((t) =>
      t.slug.includes('montpellier-mixed-3-3'),
    )
    expect(montpellier).toBeDefined()
    expect(montpellier!.name).toMatch(/Montpellier Mixed/)
    expect(montpellier!.city).toBe('Montpellier')
    expect(montpellier!.teamCount).toBe(19)
  })

  it('normalizes RSC dates', () => {
    for (const t of tournaments) {
      if (t.dateStart) expect(t.dateStart.startsWith('$')).toBe(false)
    }
  })

  it('extracts continentCode from tournament objects', () => {
    const montpellier = tournaments.find((t) =>
      t.slug.includes('montpellier-mixed-3-3'),
    )
    expect(montpellier?.continentCode).toBe('EU')
    const fresno = tournaments.find((t) => t.slug.includes('fresno'))
    expect(fresno?.continentCode).toBe('NA')
  })
})

describe('extractTournamentRosters (real payload)', () => {
  const { teams, matches } = extractTournamentRosters(
    parseRscStream(fixture('montpellier.rsc.json')),
  )

  it('extracts the 19 teams with rosters', () => {
    expect(teams).toHaveLength(19)
    const rapt = teams.find((t) => t.name === 'RAPTUS')
    expect(rapt).toBeDefined()
    expect(rapt!.playerIds).toHaveLength(4)
    for (const team of teams) expect(team.name.trim()).toBe(team.name)
  })

  it('extracts roster player names aligned with player ids', () => {
    for (const team of teams) {
      expect(team.playerNames.length).toBe(team.playerIds.length)
      for (const name of team.playerNames) expect(name.trim().length).toBeGreaterThan(0)
    }
    const rapt = teams.find((t) => t.name === 'RAPTUS')
    expect(rapt!.playerNames).toHaveLength(4)
    const paranoia = teams.find((t) => t.name === 'Paranoïd')
    expect(paranoia!.playerNames.some((n) => n.includes('Manu'))).toBe(true)
  })

  it('extracts the 169 matches with normalized fields', () => {
    expect(matches).toHaveLength(169)
    const withReferee = matches.filter((m) => m.refereeName)
    expect(withReferee.length).toBe(114)
    const forfeits = matches.filter((m) => !m.teamAId || !m.teamBId)
    expect(forfeits).toHaveLength(15)
    for (const m of matches) {
      expect(m.startAt.startsWith('$')).toBe(false)
    }
    expect(matches.some((m) => m.refereeName === 'Manu (ntods)')).toBe(true)
  })

  it('dedupes matches by id', () => {
    const ids = new Set(matches.map((m) => m.id))
    expect(ids.size).toBe(matches.length)
  })
})

describe('extractTournamentRosters (synthetic)', () => {
  it('parses the coReferee alongside the referee', () => {
    const stream = [
      '0:["tree",{"children":["__PAGE__",{}]}]',
      '1:' +
        JSON.stringify([
          'Jroot',
          [
            null,
            {
              id: 'm1',
              teamAId: 'ta',
              teamBId: 'tb',
              startAt: '$D2026-09-01T10:00:00.000Z',
              courtName: 'Court 1',
              status: 'FINISHED',
              scoreA: 2,
              scoreB: 1,
              refereePlayerId: 'p1',
              referee: { id: 'p1', name: 'Yann Pivot' },
              coRefereePlayerId: 'p2',
              coReferee: { id: 'p2', name: 'Caro Paulette' },
            },
            { id: 'ta', name: 'Team A', players: [{ playerId: 'p1' }] },
          ],
        ]),
    ].join('\n')
    const { matches } = extractTournamentRosters(parseRscStream(stream))
    expect(matches[0].coRefereeName).toBe('Caro Paulette')
    expect(matches[0].coRefereePlayerId).toBe('p2')
  })

  it('excludes waiting-list teams (selected: false)', () => {
    const stream = [
      '0:["tree",{"children":["__PAGE__",{}]}]',
      '1:' +
        JSON.stringify([
          'Jroot',
          [
            null,
            {
              id: 't1',
              name: 'Confirmed',
              selected: true,
              players: [{ playerId: 'p1' }],
            },
            {
              id: 't2',
              name: 'Waitlisted',
              selected: false,
              players: [{ playerId: 'p2' }],
            },
          ],
        ]),
    ].join('\n')
    const { teams } = extractTournamentRosters(parseRscStream(stream))
    expect(teams.map((t) => t.name)).toEqual(['Confirmed'])
  })

  it('keeps teams whose selection flag is absent', () => {
    const stream = [
      '0:["tree",{"children":["__PAGE__",{}]}]',
      '1:' +
        JSON.stringify([
          'Jroot',
          [
            null,
            { id: 't1', name: 'Legacy', players: [{ playerId: 'p1' }] },
          ],
        ]),
    ].join('\n')
    const { teams } = extractTournamentRosters(parseRscStream(stream))
    expect(teams.map((t) => t.name)).toEqual(['Legacy'])
  })

  it('finds matches and teams in a hand-crafted chunk', () => {
    const stream = [
      '0:["tree",{"children":["__PAGE__",{}]}]',
      '1:' +
        JSON.stringify([
          'Jroot',
          [
            null,
            {
              id: 'm1',
              teamAId: 'ta',
              teamBId: 'tb',
              startAt: '$D2026-09-01T10:00:00.000Z',
              courtName: 'Court 1',
              status: 'FINISHED',
              scoreA: 2,
              scoreB: 1,
              refereePlayerId: 'p1',
              referee: { id: 'p1', name: 'Yann Pivot' },
            },
            { id: 'ta', name: '  Team A  ', players: [{ playerId: 'p1' }] },
          ],
        ]),
    ].join('\n')
    const { teams, matches } = extractTournamentRosters(parseRscStream(stream))
    expect(teams).toHaveLength(1)
    expect(teams[0].name).toBe('Team A')
    expect(matches).toHaveLength(1)
    expect(matches[0].startAt).toBe('2026-09-01T10:00:00.000Z')
    expect(matches[0].refereeName).toBe('Yann Pivot')
  })
})