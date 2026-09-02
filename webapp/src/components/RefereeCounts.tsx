import type { RefereeCountEntry } from "../types/poloperator";

interface RefereeCountsProps {
  counts: RefereeCountEntry[];
}

export function RefereeCounts({ counts }: RefereeCountsProps) {
  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <section>
      <h2 className="font-display mb-3 text-xl font-bold tracking-tight text-ink">
        Compteurs d'arbitrage
      </h2>
      <ul className="space-y-1.5">
        {counts
          .sort((a, b) => a.count - b.count)
          .map((entry) => (
            <li key={entry.teamId} className="flex items-center gap-3 text-sm">
              <div className="w-44 min-w-0">
                <p
                  className="truncate text-sm font-medium text-ink"
                  title={entry.teamName}
                >
                  {entry.teamName}
                </p>
                {entry.playerNames.length > 0 ? (
                  <p
                    className="truncate text-xs text-muted"
                    title={entry.playerNames.join(" · ")}
                  >
                    {entry.playerNames.join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-chip">
                <div
                  className="h-full rounded-full bg-teal"
                  style={{ width: `${(entry.count / max) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-muted">
                {entry.count}
              </span>
            </li>
          ))}
      </ul>
    </section>
  );
}
