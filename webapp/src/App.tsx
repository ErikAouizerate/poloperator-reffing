import { useEffect, useMemo, useState } from 'react'
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
import { filterTournaments } from './services/poloperator/filter'

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

  const filteredList = useMemo(
    () => (list ? filterTournaments(list, settings) : null),
    [list, settings],
  )

  useEffect(() => {
    dispatch(loadTournamentsRequested())
  }, [dispatch])

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

  const summary = selected.summary

  return (
    <main className="min-h-svh bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              poloperator-reffing
            </h1>
            <p className="text-sm text-neutral-400">
              Anticipe les équipes qui doivent arbitrer, au compteur équilibré.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TournamentPicker
              tournaments={filteredList}
              loading={listLoading}
              selectedSlug={summary?.slug ?? null}
              onSelect={(t) =>
                dispatch(loadTournamentRequested({ slug: t.slug, summary: t }))
              }
            />
            <RefreshButton
              loading={listLoading || selected.loading}
              onRefresh={handleRefresh}
            />
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Configuration"
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-teal-500 hover:text-teal-400"
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
          <p className="text-sm text-neutral-500">
            {listLoading
              ? 'Chargement des tournois…'
              : 'Choisis un tournoi dans la liste pour voir les arbitres à venir.'}
          </p>
        ) : selected.loading ? (
          <p className="text-sm text-neutral-400">
            Chargement de « {summary.name} »…
          </p>
        ) : selected.error ? (
          <ErrorBanner
            message={`Impossible de charger « ${summary.name} » : ${selected.error}`}
          />
        ) : selected.data ? (
          <div className="space-y-10">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">
                {summary.name}
              </h2>
              <p className="text-sm text-neutral-400">
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
    <p className="mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
      {message}
    </p>
  )
}

export default App