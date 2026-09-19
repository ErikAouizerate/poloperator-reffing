import type { TournamentData } from '../types/poloperator'
import {
  loadTournamentSchedule,
  loadTournaments,
} from '../services/poloperator/fetch'
import { buildPrediction } from '../services/prediction'
import type { TournamentLoadPayload } from './tournamentActions'

/**
 * Side effects executed by the apiMiddleware for `*_REQUESTED` actions.
 * Keyed by the action base name (the `*_REQUESTED` suffix is stripped).
 */
type Effect = (payload: unknown) => Promise<unknown>

export const apiEffects: Record<string, Effect> = {
  TOURNAMENTS_LOAD: async () => loadTournaments(),

  TOURNAMENT_LOAD: async (payload) => {
    const { slug, summary } = payload as TournamentLoadPayload
    const rosters = await loadTournamentSchedule(slug)
    const prediction = buildPrediction(rosters.teams, rosters.matches)
    const data: TournamentData = {
      summary,
      teams: prediction.teams,
      slots: prediction.slots,
      upcomingMatches: prediction.upcomingMatches,
      suggestionsByMatch: prediction.suggestionsByMatch,
      refereeCounts: prediction.refereeCounts,
      gameDurationMin: rosters.gameDurationMin,
    }
    return data
  },
}