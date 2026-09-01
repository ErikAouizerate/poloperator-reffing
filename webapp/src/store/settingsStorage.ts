import { isContinentCode } from '../types/poloperator'
import { DEFAULT_SETTINGS, type Settings } from './settings'

const STORAGE_KEY = 'poloperator:settings:v1'

let storageOverride: Storage | null | undefined

/** Test seam: inject a fake Storage for node-based tests. */
export function __setStorage(storage: Storage | null): void {
  storageOverride = storage
}

function readStorage(): Storage | null {
  if (storageOverride !== undefined) return storageOverride
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function clampCount(value: number): number {
  return Math.min(8, Math.max(1, Math.round(value)))
}

function normalizeContinent(value: unknown): Settings['continent'] {
  if (value === 'ALL') return 'ALL'
  return isContinentCode(value) ? value : DEFAULT_SETTINGS.continent
}

export function loadSettings(): Settings {
  const storage = readStorage()
  if (!storage) return DEFAULT_SETTINGS
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      showLiveOnly:
        typeof parsed.showLiveOnly === 'boolean'
          ? parsed.showLiveOnly
          : DEFAULT_SETTINGS.showLiveOnly,
      suggestedTeamCount:
        typeof parsed.suggestedTeamCount === 'number' &&
        Number.isFinite(parsed.suggestedTeamCount)
          ? clampCount(parsed.suggestedTeamCount)
          : DEFAULT_SETTINGS.suggestedTeamCount,
      continent: normalizeContinent(parsed.continent),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  const storage = readStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Quota / security errors are ignored.
  }
}