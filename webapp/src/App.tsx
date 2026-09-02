import { useEffect, useMemo, useRef, useState } from 'react'
import type { TournamentSummary } from './types/poloperator'
import { useAppDispatch, useAppSelector } from './hooks'
import {
  loadTournamentRequested,
  loadTournamentsRequested,
} from './store/tournamentActions'
import { TournamentPicker } from './components/TournamentPicker'
import { UpcomingMatches } from './components/UpcomingMatches'
import { RefereeCounts } from './components/RefereeCounts'
import { RefreshButton } from './components/RefreshButton'
import { SettingsModal } from './components/SettingsModal'
import { resolvePickerList } from './services/poloperator/filter'
import {
  parseSlugFromSearch,
  syncTournamentSlug,
} from './utils/urlTournament'

function formatTournamentDates(summary: TournamentSummary): string {
  const parts: string[] = []
  if (summary.dateStart) {
    const start = new Date(summary.dateStart)
    const end = summary.dateEnd ? new Date(summary.dateEnd) : null
    parts.push(
      end
        ? `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
    )
  }
  if (summary.city) parts.push(summary.city)
  if (summary.country) parts.push(summary.country)
  return parts.join(' · ')
}

function App() {
  const dispatch = useAppDispatch()
  const list = useAppSelector((s) => s.tournament.list)
  const listLoading = useAppSelector((s) => s.tournament.listLoading)
  const listError = useAppSelector((s) => s.tournament.listError)
  const selected = useAppSelector((s) => s.tournament.selected)
  const settings = useAppSelector((s) => s.settings)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const summary = selected.summary

  const [urlSlug] = useState(() =>
    typeof window === 'undefined'
      ? null
      : parseSlugFromSearch(window.location.search),
  )
  const urlHandledRef = useRef(false)

  const selectedSlug = useMemo(() => {
    if (summary?.slug) return summary.slug
    if (!urlSlug || !list) return null
    return list.some((t) => t.slug === urlSlug) ? urlSlug : null
  }, [summary, urlSlug, list])

  const pickerList = useMemo(
    () => resolvePickerList(list, settings, selectedSlug),
    [list, settings, selectedSlug],
  )

  useEffect(() => {
    dispatch(loadTournamentsRequested())
  }, [dispatch])

  useEffect(() => {
    if (urlHandledRef.current) return
    if (!urlSlug || !list || selected.loading || selected.summary) return
    const summary = list.find((t) => t.slug === urlSlug)
    urlHandledRef.current = true
    if (!summary) return
    dispatch(loadTournamentRequested({ slug: urlSlug, summary }))
  }, [urlSlug, list, selected.loading, selected.summary, dispatch])

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const team of selected.data?.teams ?? []) map.set(team.id, team.name)
    return (teamId: string | null) =>
      teamId ? (map.get(teamId) ?? '?') : '?'
  }, [selected.data])

  const handleRefresh = () => {
    dispatch(loadTournamentsRequested())
    if (selected.summary) {
      dispatch(
        loadTournamentRequested({
          slug: selected.summary.slug,
          summary: selected.summary,
        }),
      )
    }
  }

  const handleSelect = (t: TournamentSummary) => {
    dispatch(loadTournamentRequested({ slug: t.slug, summary: t }))
    syncTournamentSlug(t.slug)
  }

  return (
    <main className="min-h-svh bg-bg font-sans text-ink">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              poloperator-reffing
            </h1>
            <p className="text-sm text-muted">
              Anticipe les équipes qui doivent arbitrer, au compteur équilibré.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TournamentPicker
              tournaments={pickerList}
              loading={listLoading}
              selectedSlug={selectedSlug}
              onSelect={handleSelect}
            />
            <RefreshButton
              loading={listLoading || selected.loading}
              onRefresh={handleRefresh}
            />
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Configuration"
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-surface text-sm text-ink hover:bg-teal"
            >
              ⚙
            </button>
          </div>
        </header>

        {listError ? (
          <ErrorBanner
            message={`Impossible de charger les tournois : ${listError}`}
          />
        ) : null}

        {!summary ? (
          <p className="text-sm text-muted">
            {listLoading
              ? 'Chargement des tournois…'
              : 'Choisis un tournoi dans la liste pour voir les arbitres à venir.'}
          </p>
        ) : selected.loading ? (
          <p className="text-sm text-muted">
            Chargement de « {summary.name} »…
          </p>
        ) : selected.error ? (
          <ErrorBanner
            message={`Impossible de charger « ${summary.name} » : ${selected.error}`}
          />
        ) : selected.data ? (
          <div className="space-y-10">
            <div>
              <h2 className="text-lg font-black tracking-tight text-ink">
                {summary.name}
              </h2>
              <p className="text-sm text-muted">
                {formatTournamentDates(summary)} ·{' '}
                {selected.data.teams.length} équipes ·{' '}
                {selected.data.upcomingMatches.length} match à venir
                {selected.data.upcomingMatches.length > 1 ? 's' : ''}
              </p>
            </div>
            <UpcomingMatches
              matches={selected.data.upcomingMatches}
              suggestionsByMatch={selected.data.suggestionsByMatch}
              teamNameById={teamNameById}
              suggestionLimit={settings.suggestedTeamCount}
            />
            <RefereeCounts counts={selected.data.refereeCounts} />
          </div>
        ) : null}
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
      />
    </main>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="mb-6 rounded-lg border-2 border-ink bg-pink px-4 py-3 text-sm font-medium text-ink">
      {message}
    </p>
  )
}

export default App