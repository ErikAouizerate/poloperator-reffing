import type { ContinentCode } from '../types/poloperator'

export interface Settings {
  showLiveOnly: boolean
  suggestedTeamCount: number
  continent: ContinentCode | 'ALL'
  refreshIntervalSeconds: number
}

export const DEFAULT_SETTINGS: Settings = {
  showLiveOnly: true,
  suggestedTeamCount: 4,
  continent: 'EU',
  refreshIntervalSeconds: 240,
}

export const CONTINENTS: ReadonlyArray<[ContinentCode, string]> = [
  ['EU', 'Europe'],
  ['NA', 'Amérique du Nord'],
  ['SA', 'Amérique du Sud'],
  ['AF', 'Afrique'],
  ['AS', 'Asie'],
  ['OC', 'Océanie'],
]