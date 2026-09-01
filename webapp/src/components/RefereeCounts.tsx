import type { RefereeCountEntry } from '../types/poloperator'

interface RefereeCountsProps {
  counts: RefereeCountEntry[]
}

export function RefereeCounts({ counts }: RefereeCountsProps) {
  const max = Math.max(...counts.map((c) => c.count), 1)

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-neutral-100">
        Compteurs d'arbitrage
      </h2>
      <ul className="space-y-1.5">
        {counts.map((entry) => (
          <li key={entry.teamId} className="flex items-center gap-3 text-sm">
            <span className="w-40 truncate text-neutral-200">
              {entry.teamName}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-teal-500/70"
                style={{ width: `${(entry.count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right tabular-nums text-neutral-400">
              {entry.count}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}