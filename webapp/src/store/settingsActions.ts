import type { Settings } from './settings'

export const SETTINGS_UPDATE = 'SETTINGS_UPDATE'

export const updateSettings = (payload: Partial<Settings>) => ({
  type: SETTINGS_UPDATE,
  payload,
})