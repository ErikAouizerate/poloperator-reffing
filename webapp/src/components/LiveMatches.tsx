import type { Match } from '../types/poloperator'

interface LiveMatchesProps {
  matches: Match[]
  teamNameById: (teamId: string | null) => string
}

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

export function LiveMatches({ matches, teamNameById }: LiveMatchesProps) {
  if (matches.length === 0) return null

  const sorted = [...matches].sort((a, b) =>
    a.startAt.localeCompare(b.startAt),
  )

  return (
    <section>
      <h2 className="font-display mb-3 text-xl font-bold tracking-tight text-ink">
        Matchs en cours
      </h2>
      <ul className="space-y-3">
        {sorted.map((match) => {
          const hasScore = match.scoreA !== null || match.scoreB !== null
          return (
            <li
              key={match.id}
              className="rounded-[14px] border-2 border-ink bg-surface p-4 shadow-kit"
            >
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>{formatMatchDate(match.startAt)}</span>
                <span className="font-medium text-ink">
                  {formatMatchTime(match.startAt)}
                </span>
                <span className="rounded-md border-2 border-red bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                  En direct
                </span>
                {match.courtName ? (
                  <span className="rounded-md border-2 border-ink bg-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                    {match.courtName}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                <span>{teamNameById(match.teamAId)}</span>
                <span className="text-muted">vs</span>
                <span>{teamNameById(match.teamBId)}</span>
                {hasScore ? (
                  <span className="tabular-nums text-ink">
                    {match.scoreA ?? 0} — {match.scoreB ?? 0}
                  </span>
                ) : null}
              </div>
              {match.refereeName ? (
                <p className="mt-2 text-xs text-muted">
                  Arbitre : {match.refereeName}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}