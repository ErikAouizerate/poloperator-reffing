import { describe, expect, it } from 'vitest'
import type { Match } from '../../types/poloperator'
import {
  DEFAULT_COURT,
  DEFAULT_THEME,
  buildOverlayHref,
  buildOverlayPath,
  listOverlayCourts,
  parseOverlayParams,
} from './overlayParams'

function matchWithCourt(courtName: Match['courtName']): Match {
  return {
    id: '',
    startAt: '',
    courtName,
    status: '',
    phase: null,
    teamAId: null,
    teamBId: null,
    scoreA: null,
    scoreB: null,
    refereePlayerId: null,
    refereeName: null,
    coRefereePlayerId: null,
    coRefereeName: null,
    events: [],
  }
}

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

describe('buildOverlayHref', () => {
  it('builds the same-app overlay href', () => {
    expect(buildOverlayHref('newcastle-abc', '2')).toBe(
      '/overlay?tournament=newcastle-abc&court=2',
    )
  })

  it('percent-encodes the slug', () => {
    expect(buildOverlayHref('a b/c', '1')).toBe(
      '/overlay?tournament=a%20b%2Fc&court=1',
    )
  })
})

describe('listOverlayCourts', () => {
  it('returns distinct courts sorted by name with their overlay number', () => {
    expect(
      listOverlayCourts([
        matchWithCourt('Court 2'),
        matchWithCourt('Court 1'),
        matchWithCourt('Court 1'),
      ]),
    ).toEqual([
      { name: 'Court 1', court: '1' },
      { name: 'Court 2', court: '2' },
    ])
  })

  it('ignores matches without a court name', () => {
    expect(listOverlayCourts([matchWithCourt(null)])).toEqual([])
  })

  it('falls back to the sorted position when the name has no digits', () => {
    expect(listOverlayCourts([matchWithCourt('Central')])).toEqual([
      { name: 'Central', court: '1' },
    ])
  })
})
