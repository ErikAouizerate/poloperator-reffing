import { useState } from "react";
import type { RefereeSuggestion } from "../types/poloperator";
import type { UpcomingWithHorizon } from "../services/prediction/timeline";
import { TIER_BG, TIER_LABEL } from "./tierStyles";

interface UpcomingMatchesProps {
  matches: UpcomingWithHorizon[];
  suggestionsByMatch: Record<string, RefereeSuggestion[]>;
  teamNameById: (teamId: string | null) => string;
  playerNamesById: (teamId: string | null) => string[];
  suggestionLimit: number;
}

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

function ChevronToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={expanded ? "Replier" : "Déplier"}
      title={expanded ? "Replier" : "Déplier"}
      className="flex h-8 w-8 items-center justify-center rounded-[10px] border-2 border-ink bg-surface text-ink shadow-kit hover:bg-teal"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <path
          d={expanded ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function UpcomingMatches({
  matches,
  suggestionsByMatch,
  teamNameById,
  playerNamesById,
  suggestionLimit,
}: UpcomingMatchesProps) {
  const [expanded, setExpanded] = useState(false);

  const participants = (teamId: string | null) => {
    const names = playerNamesById(teamId);
    return names.length > 0 ? names.join(" · ") : undefined;
  };

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

  const visibleMatches = expanded
    ? sorted
    : sorted.filter((entry) => entry.horizon <= 2);
  const hasMoreWaves = sorted.some((entry) => entry.horizon > 2);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">
          Matchs à venir & arbitres suggérés
        </h2>
        {hasMoreWaves ? (
          <ChevronToggle
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
          />
        ) : null}
      </div>
      <ul className="space-y-3">
        {visibleMatches.map((entry) => (
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
              <span title={participants(entry.match.teamAId)}>
                {teamNameById(entry.match.teamAId)}
              </span>
              <span className="text-muted">vs</span>
              <span title={participants(entry.match.teamBId)}>
                {teamNameById(entry.match.teamBId)}
              </span>
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
      {hasMoreWaves ? (
        <div className="mt-3 flex justify-end">
          <ChevronToggle
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
          />
        </div>
      ) : null}
    </section>
  );
}
