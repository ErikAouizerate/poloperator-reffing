import type { TournamentSummary } from '../types/poloperator'

export const TOURNAMENTS_LOAD_REQUESTED = 'TOURNAMENTS_LOAD_REQUESTED'
export const TOURNAMENTS_LOAD_START = 'TOURNAMENTS_LOAD_START'
export const TOURNAMENTS_LOAD_SUCCESS = 'TOURNAMENTS_LOAD_SUCCESS'
export const TOURNAMENTS_LOAD_ERROR = 'TOURNAMENTS_LOAD_ERROR'

export const TOURNAMENT_LOAD_REQUESTED = 'TOURNAMENT_LOAD_REQUESTED'
export const TOURNAMENT_LOAD_START = 'TOURNAMENT_LOAD_START'
export const TOURNAMENT_LOAD_SUCCESS = 'TOURNAMENT_LOAD_SUCCESS'
export const TOURNAMENT_LOAD_ERROR = 'TOURNAMENT_LOAD_ERROR'

export interface TournamentLoadPayload {
  slug: string
  summary: TournamentSummary
}

export const loadTournamentsRequested = () => ({
  type: TOURNAMENTS_LOAD_REQUESTED,
})

export const loadTournamentRequested = (payload: TournamentLoadPayload) => ({
  type: TOURNAMENT_LOAD_REQUESTED,
  payload,
})