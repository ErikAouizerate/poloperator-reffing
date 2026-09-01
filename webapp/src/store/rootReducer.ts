import { combineReducers } from 'redux'

import { settingsReducer } from './settingsReducer'
import { tournamentReducer } from './tournamentReducer'
import { uiReducer } from './uiReducer'

export const rootReducer = combineReducers({
  ui: uiReducer,
  tournament: tournamentReducer,
  settings: settingsReducer,
})
