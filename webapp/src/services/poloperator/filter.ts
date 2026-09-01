import type { Settings } from '../../store/settings'
import type { TournamentSummary } from '../../types/poloperator'

export function filterTournaments(
  list: TournamentSummary[],
  settings: Settings,
): TournamentSummary[] {
  return list.filter(
    (t) =>
      (settings.continent === 'ALL' ||
        t.continentCode === settings.continent) &&
      (!settings.showLiveOnly || t.status === 'LIVE'),
  )
}