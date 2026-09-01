import type { AnyAction, Reducer } from 'redux'

export interface UiState {
  loaded: boolean
}

const initialState: UiState = {
  loaded: false,
}

export const uiReducer: Reducer<UiState> = (
  state = initialState,
  action: AnyAction,
) => {
  switch (action.type) {
    default:
      return state
  }
}