import type { AnyAction, Reducer } from 'redux'
import type { Settings } from './settings'
import { SETTINGS_UPDATE } from './settingsActions'
import { loadSettings, saveSettings } from './settingsStorage'

function clampCount(value: number): number {
  return Math.min(8, Math.max(1, Math.round(value)))
}

export const settingsReducer: Reducer<Settings> = (
  state: Settings = loadSettings(),
  action: AnyAction,
) => {
  switch (action.type) {
    case SETTINGS_UPDATE: {
      const partial = action.payload as Partial<Settings>
      const next: Settings = {
        ...state,
        ...partial,
        suggestedTeamCount:
          typeof partial.suggestedTeamCount === 'number'
            ? clampCount(partial.suggestedTeamCount)
            : state.suggestedTeamCount,
      }
      saveSettings(next)
      return next
    }
    default:
      return state
  }
}