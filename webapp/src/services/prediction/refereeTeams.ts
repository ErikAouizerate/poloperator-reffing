import type { Match, Team } from '../../types/poloperator'

export interface RefereeTeams {
  referee: string | null
  coReferee: string | null
}

/**
 * Team name of each assigned referee, resolved from the tournament rosters.
 * The main referee and the co-referee are reported separately, so two referees
 * from the same roster yield the same team name twice.
 */
export function refereeTeams(
  teams: Team[],
  match: Pick<Match, 'refereePlayerId' | 'coRefereePlayerId'>,
): RefereeTeams {
  const playerIdToTeam = new Map<string, string>()
  const teamNameById = new Map<string, string>()
  for (const team of teams) {
    teamNameById.set(team.id, team.name)
    for (const playerId of team.playerIds) {
      if (!playerIdToTeam.has(playerId)) playerIdToTeam.set(playerId, team.id)
    }
  }

  const teamNameOf = (playerId: string | null): string | null => {
    if (!playerId) return null
    const teamId = playerIdToTeam.get(playerId)
    return teamId ? (teamNameById.get(teamId) ?? null) : null
  }

  return {
    referee: teamNameOf(match.refereePlayerId),
    coReferee: teamNameOf(match.coRefereePlayerId),
  }
}
