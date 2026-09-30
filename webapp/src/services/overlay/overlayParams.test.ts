import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COURT,
  DEFAULT_THEME,
  buildOverlayPath,
  parseOverlayParams,
} from './overlayParams'

describe('parseOverlayParams', () => {
  it('reads the tournament slug, court and theme', () => {
    expect(
      parseOverlayParams('?tournament=newcastle-abc&court=2&theme=light'),
    ).toEqual({ tournament: 'newcastle-abc', court: '2', theme: 'light' })
  })

  it('defaults court to 1 and theme to dark', () => {
    expect(parseOverlayParams('?tournament=newcastle-abc')).toEqual({
      tournament: 'newcastle-abc',
      court: DEFAULT_COURT,
      theme: DEFAULT_THEME,
    })
  })

  it('returns a null tournament when the param is missing or empty', () => {
    expect(parseOverlayParams('').tournament).toBeNull()
    expect(parseOverlayParams('?tournament=').tournament).toBeNull()
  })
})

describe('buildOverlayPath', () => {
  it('builds the upstream overlay path', () => {
    expect(
      buildOverlayPath({ tournament: 'newcastle-abc', court: '1', theme: 'dark' }),
    ).toBe('/fr/tournament/newcastle-abc/overlay?court=1&theme=dark')
  })

  it('percent-encodes the slug', () => {
    expect(
      buildOverlayPath({ tournament: 'a b/c', court: '1', theme: 'dark' }),
    ).toBe('/fr/tournament/a%20b%2Fc/overlay?court=1&theme=dark')
  })

  it('returns null without a tournament', () => {
    expect(
      buildOverlayPath({ tournament: null, court: '1', theme: 'dark' }),
    ).toBeNull()
  })
})
