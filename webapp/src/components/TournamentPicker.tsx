import { useMemo } from 'react'
import type { TournamentSummary } from '../types/poloperator'

interface TournamentPickerProps {
  tournaments: TournamentSummary[] | null
  loading: boolean
  selectedSlug: string | null
  onSelect: (tournament: TournamentSummary) => void
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

export function TournamentPicker({
  tournaments,
  loading,
  selectedSlug,
  onSelect,
}: TournamentPickerProps) {
  const sorted = useMemo(() => {
    if (!tournaments) return []
    return [...tournaments].sort((a, b) => {
      const aTime = a.dateStart ? new Date(a.dateStart).getTime() : 0
      const bTime = b.dateStart ? new Date(b.dateStart).getTime() : 0
      return bTime - aTime || a.name.localeCompare(b.name)
    })
  }, [tournaments])

  return (
    <div className="flex items-center gap-3">
      <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Tournoi</label>
      <select
        className="min-w-64 rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal"
        value={selectedSlug ?? ''}
        onChange={(e) => {
          const summary = sorted.find((t) => t.slug === e.target.value)
          if (summary) onSelect(summary)
        }}
        disabled={loading}
      >
        <option value="" disabled>
          {loading ? 'Chargement…' : 'Choisir un tournoi'}
        </option>
        {sorted.map((t) => (
          <option key={t.id} value={t.slug}>
            {t.name} — {t.city ?? t.country ?? ''}
            {t.dateStart ? ` (${formatDate(t.dateStart)})` : ''}
          </option>
        ))}
      </select>
      {tournaments !== null && tournaments.length === 0 ? (
        <p className="text-xs text-muted">
          Aucun tournoi ne correspond aux filtres.
        </p>
      ) : null}
    </div>
  )
}