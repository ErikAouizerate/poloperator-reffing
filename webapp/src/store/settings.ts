import type { ContinentCode } from '../types/poloperator'

export interface Settings {
  showLiveOnly: boolean
  suggestedTeamCount: number
  continent: ContinentCode | 'ALL'
}

export const DEFAULT_SETTINGS: Settings = {
  showLiveOnly: true,
  suggestedTeamCount: 4,
  continent: 'EU',
}

export const CONTINENTS: ReadonlyArray<[ContinentCode, string]> = [
  ['EU', 'Europe'],
  ['NA', 'Amérique du Nord'],
  ['SA', 'Amérique du Sud'],
  ['AF', 'Afrique'],
  ['AS', 'Asie'],
  ['OC', 'Océanie'],
]