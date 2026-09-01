import type { AnyAction, Reducer } from 'redux'
import type {
  TournamentData,
  TournamentSummary,
} from '../types/poloperator'
import {
  TOURNAMENTS_LOAD_ERROR,
  TOURNAMENTS_LOAD_START,
  TOURNAMENTS_LOAD_SUCCESS,
  TOURNAMENT_LOAD_ERROR,
  TOURNAMENT_LOAD_START,
  TOURNAMENT_LOAD_SUCCESS,
} from './tournamentActions'

export interface SelectedTournamentState {
  summary: TournamentSummary | null
  data: TournamentData | null
  loading: boolean
  error: string | null
}

export interface TournamentState {
  list: TournamentSummary[] | null
  listLoading: boolean
  listError: string | null
  selected: SelectedTournamentState
}

const initialState: TournamentState = {
  list: null,
  listLoading: false,
  listError: null,
  selected: {
    summary: null,
    data: null,
    loading: false,
    error: null,
  },
}

export const tournamentReducer: Reducer<TournamentState> = (
  state = initialState,
  action: AnyAction,
) => {
  switch (action.type) {
    case TOURNAMENTS_LOAD_START:
      return { ...state, listLoading: true, listError: null }
    case TOURNAMENTS_LOAD_SUCCESS:
      return {
        ...state,
        list: action.payload as TournamentSummary[],
        listLoading: false,
      }
    case TOURNAMENTS_LOAD_ERROR:
      return {
        ...state,
        listLoading: false,
        listError: action.payload instanceof Error ? action.payload.message : String(action.payload),
      }
    case TOURNAMENT_LOAD_START:
      return {
        ...state,
        selected: {
          summary: state.selected.summary,
          data: state.selected.data,
          loading: true,
          error: null,
        },
      }
    case TOURNAMENT_LOAD_SUCCESS: {
      const data = action.payload as TournamentData
      return {
        ...state,
        selected: {
          summary: data.summary,
          data,
          loading: false,
          error: null,
        },
      }
    }
    case TOURNAMENT_LOAD_ERROR:
      return {
        ...state,
        selected: {
          ...state.selected,
          loading: false,
          error:
            action.payload instanceof Error
              ? action.payload.message
              : String(action.payload),
        },
      }
    default:
      return state
  }
}