import { describe, expect, it } from 'vitest'
import type { Match, Team } from '../../types/poloperator'
import { refereeTeams } from './refereeTeams'

function team(id: string, name: string, playerIds: string[]): Team {
  return { id, name, playerIds, playerNames: playerIds }
}

function match(
  refereePlayerId: string | null,
  coRefereePlayerId: string | null,
): Pick<Match, 'refereePlayerId' | 'coRefereePlayerId'> {
  return { refereePlayerId, coRefereePlayerId }
}

const teams = [
  team('t1', 'Organ Döner', ['p1', 'p2']),
  team('t2', 'Firestone', ['p3']),
  team('t3', 'Pivot', ['p4']),
]

describe('refereeTeams', () => {
  it('returns the same team for both referees when they share a roster', () => {
    expect(refereeTeams(teams, match('p1', 'p2'))).toEqual({
      referee: 'Organ Döner',
      coReferee: 'Organ Döner',
    })
  })

  it('returns each team in its referee role when they differ', () => {
    expect(refereeTeams(teams, match('p1', 'p3'))).toEqual({
      referee: 'Organ Döner',
      coReferee: 'Firestone',
    })
  })

  it('returns null for a player id that does not resolve to a known team', () => {
    expect(refereeTeams(teams, match('unknown', 'p3'))).toEqual({
      referee: null,
      coReferee: 'Firestone',
    })
  })

  it('returns the co-referee team when only the co-referee is set', () => {
    expect(refereeTeams(teams, match(null, 'p4'))).toEqual({
      referee: null,
      coReferee: 'Pivot',
    })
  })

  it('returns nulls when no referee is assigned', () => {
    expect(refereeTeams(teams, match(null, null))).toEqual({
      referee: null,
      coReferee: null,
    })
  })
})
