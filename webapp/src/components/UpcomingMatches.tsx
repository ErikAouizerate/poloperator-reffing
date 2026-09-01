import type { Match, RefereeSuggestion } from '../types/poloperator'

interface UpcomingMatchesProps {
  matches: Match[]
  suggestionsByMatch: Record<string, RefereeSuggestion[]>
  teamNameById: (teamId: string | null) => string
  suggestionLimit: number
}

const TIER_LABEL: Record<number, string> = { 1: 'T+2', 2: 'proche', 3: 'repli' }

function formatMatchDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatMatchTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function UpcomingMatches({
  matches,
  suggestionsByMatch,
  teamNameById,
  suggestionLimit,
}: UpcomingMatchesProps) {
  if (matches.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Aucun match à venir — tournoi terminé ou planning indisponible.
      </p>
    )
  }

  const sorted = [...matches].sort((a, b) => a.startAt.localeCompare(b.startAt))

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-neutral-100">
        Matchs à venir & arbitres suggérés
      </h2>
      <ul className="space-y-3">
        {sorted.map((match) => (
          <li
            key={match.id}
            className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"
          >
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
              <span>{formatMatchDate(match.startAt)}</span>
              <span className="font-medium text-neutral-300">
                {formatMatchTime(match.startAt)}
              </span>
              {match.courtName ? (
                <span className="rounded bg-neutral-800 px-2 py-0.5">
                  {match.courtName}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
              <span>{teamNameById(match.teamAId)}</span>
              <span className="text-neutral-500">vs</span>
              <span>{teamNameById(match.teamBId)}</span>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-xs text-neutral-500">Arbitres suggérés</p>
              <ol className="space-y-1">
                {(suggestionsByMatch[match.id] ?? []).slice(0, suggestionLimit).map((s, i) => (
                  <li
                    key={s.teamId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-5 text-center text-xs text-neutral-500">
                      {i + 1}.
                    </span>
                    <span className="text-neutral-200">{s.teamName}</span>
                    <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
                      {TIER_LABEL[s.tier]}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {s.refereeCount} arbitrage{s.refereeCount > 1 ? 's' : ''}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}