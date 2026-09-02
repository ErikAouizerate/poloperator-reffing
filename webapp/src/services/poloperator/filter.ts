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

export function resolvePickerList(
  list: TournamentSummary[] | null,
  settings: Settings,
  selectedSlug: string | null,
): TournamentSummary[] | null {
  if (list === null) return null
  const filtered = filterTournaments(list, settings)
  if (!selectedSlug) return filtered
  return filtered.some((t) => t.slug === selectedSlug) ? filtered : list
}
