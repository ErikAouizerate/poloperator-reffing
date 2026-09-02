import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import { updateSettings } from './settingsActions'
import { settingsReducer } from './settingsReducer'
import { __setStorage } from './settingsStorage'

function makeStorage() {
  const data = new Map<string, string>()
  const storage = {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => {
      data.set(k, v)
    },
    removeItem: (k: string) => {
      data.delete(k)
    },
  }
  return storage as unknown as Storage
}

describe('settingsReducer', () => {
  beforeEach(() => {
    __setStorage(null)
  })

  it('initializes with defaults when localStorage is unavailable', () => {
    const state = settingsReducer(undefined, { type: 'INIT' })
    expect(state).toEqual(DEFAULT_SETTINGS)
  })

  it('merges partial updates and persists', () => {
    const storage = makeStorage()
    __setStorage(storage)
    const state = settingsReducer(undefined, { type: 'INIT' })
    const next = settingsReducer(
      state,
      updateSettings({ continent: 'NA', suggestedTeamCount: 6 }),
    )
    expect(next).toEqual({ ...DEFAULT_SETTINGS, continent: 'NA', suggestedTeamCount: 6 })
    expect(storage.getItem('poloperator:settings:v1')).toBe(
      JSON.stringify(next),
    )
  })

  it('clamps suggestedTeamCount to [1, 8]', () => {
    __setStorage(makeStorage())
    const state = settingsReducer(undefined, { type: 'INIT' })
    const next = settingsReducer(state, updateSettings({ suggestedTeamCount: 99 }))
    expect(next.suggestedTeamCount).toBe(8)
    const low = settingsReducer(state, updateSettings({ suggestedTeamCount: 0 }))
    expect(low.suggestedTeamCount).toBe(1)
  })

  it('clamps refreshIntervalSeconds to [15, 3600]', () => {
    __setStorage(makeStorage())
    const state = settingsReducer(undefined, { type: 'INIT' })
    const high = settingsReducer(
      state,
      updateSettings({ refreshIntervalSeconds: 99999 }),
    )
    expect(high.refreshIntervalSeconds).toBe(3600)
    const low = settingsReducer(
      state,
      updateSettings({ refreshIntervalSeconds: 2 }),
    )
    expect(low.refreshIntervalSeconds).toBe(15)
  })

  it('returns DEFAULT_SETTINGS when stored JSON is corrupted', () => {
    const storage = makeStorage()
    storage.setItem('poloperator:settings:v1', '{not json')
    __setStorage(storage)
    const state = settingsReducer(undefined, { type: 'INIT' })
    expect(state).toEqual(DEFAULT_SETTINGS)
  })
})