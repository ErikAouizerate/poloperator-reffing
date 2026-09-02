import type { RefereeSuggestion } from "../types/poloperator";
import type { UpcomingWithHorizon } from "../services/prediction/timeline";

interface UpcomingMatchesProps {
  matches: UpcomingWithHorizon[];
  suggestionsByMatch: Record<string, RefereeSuggestion[]>;
  teamNameById: (teamId: string | null) => string;
  suggestionLimit: number;
}

const TIER_LABEL: Record<number, string> = {
  1: "Optimum",
  2: "OK",
  3: "Moins pire",
};

const TIER_BG: Record<number, string> = {
  1: "bg-teal",
  2: "bg-yellow",
  3: "bg-orange",
};

function formatMatchDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatMatchTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UpcomingMatches({
  matches,
  suggestionsByMatch,
  teamNameById,
  suggestionLimit,
}: UpcomingMatchesProps) {
  if (matches.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucun match à venir — tournoi terminé ou planning indisponible.
      </p>
    );
  }

  const sorted = [...matches].sort((a, b) =>
    a.match.startAt.localeCompare(b.match.startAt),
  );

  return (
    <section>
      <h2 className="font-display mb-3 text-xl font-bold tracking-tight text-ink">
        Matchs à venir & arbitres suggérés
      </h2>
      <ul className="space-y-3">
        {sorted.map((entry) => (
          <li
            key={entry.match.id}
            className="rounded-[14px] border-2 border-ink bg-surface p-4 shadow-kit"
          >
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>{formatMatchDate(entry.match.startAt)}</span>
              <span className="font-medium text-ink">
                {formatMatchTime(entry.match.startAt)}
              </span>
              <span className="rounded-md border-2 border-ink bg-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                T+{entry.horizon}
              </span>
              {entry.match.courtName ? (
                <span className="rounded-md border-2 border-ink bg-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                  {entry.match.courtName}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <span>{teamNameById(entry.match.teamAId)}</span>
              <span className="text-muted">vs</span>
              <span>{teamNameById(entry.match.teamBId)}</span>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-muted">
                Arbitres suggérés
              </p>
              <ol className="space-y-1">
                {(suggestionsByMatch[entry.match.id] ?? [])
                  .slice(0, suggestionLimit)
                  .map((s, i) => (
                    <li
                      key={s.teamId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-5 text-center text-xs text-muted">
                        {i + 1}.
                      </span>
                      <span className="text-ink">{s.teamName}</span>
                      <span
                        className={`rounded-md border-2 border-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink ${TIER_BG[s.tier]}`}
                      >
                        {TIER_LABEL[s.tier]}
                      </span>
                      <span className="text-xs text-muted">
                        {s.refereeCount} arbitrage
                        {s.refereeCount > 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
              </ol>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
