import { describe, expect, it } from 'vitest'
import type { TournamentSummary } from '../../types/poloperator'
import type { Settings } from '../../store/settings'
import { filterTournaments } from './filter'

function makeTournament(partial: Partial<TournamentSummary>): TournamentSummary {
  return {
    id: 't1',
    slug: 't1',
    name: 'Tournament',
    country: null,
    city: null,
    dateStart: null,
    dateEnd: null,
    format: null,
    status: 'LIVE',
    maxTeams: null,
    teamCount: null,
    continentCode: 'EU',
    ...partial,
  }
}

const baseSettings: Settings = {
  showLiveOnly: true,
  suggestedTeamCount: 4,
  continent: 'EU',
}

const liveEu = makeTournament({ id: 'a', slug: 'a', status: 'LIVE', continentCode: 'EU' })
const liveNa = makeTournament({ id: 'b', slug: 'b', status: 'LIVE', continentCode: 'NA' })
const finishedEu = makeTournament({ id: 'c', slug: 'c', status: 'COMPLETED', continentCode: 'EU' })
const futureEu = makeTournament({ id: 'd', slug: 'd', status: 'UPCOMING', continentCode: 'EU' })

describe('filterTournaments', () => {
  it('filters by continent (default Europe)', () => {
    expect(filterTournaments([liveEu, liveNa], baseSettings)).toEqual([liveEu])
  })

  it('keeps all continents when continent is ALL', () => {
    const all = { ...baseSettings, continent: 'ALL' as const }
    expect(filterTournaments([liveEu, liveNa], all)).toEqual([liveEu, liveNa])
  })

  it('keeps only LIVE tournaments when showLiveOnly is true', () => {
    expect(filterTournaments([liveEu, finishedEu, futureEu], baseSettings)).toEqual([liveEu])
  })

  it('keeps all statuses when showLiveOnly is false', () => {
    const off = { ...baseSettings, showLiveOnly: false }
    expect(filterTournaments([liveEu, finishedEu], off)).toEqual([liveEu, finishedEu])
  })

  it('keeps the input order', () => {
    const list = [finishedEu, liveNa, liveEu]
    const out = filterTournaments(list, { ...baseSettings, showLiveOnly: false, continent: 'ALL' })
    expect(out.map((t) => t.id)).toEqual(['c', 'b', 'a'])
  })
})