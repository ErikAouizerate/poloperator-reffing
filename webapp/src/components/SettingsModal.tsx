import { useEffect } from 'react'
import { useAppDispatch } from '../hooks'
import { CONTINENTS, type Settings } from '../store/settings'
import { updateSettings } from '../store/settingsActions'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  settings: Settings
}

const MAX_TEAMS = 8
const MIN_TEAMS = 1

export function SettingsModal({ open, onClose, settings }: SettingsModalProps) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Configuration"
    >
      <div
        className="w-full max-w-sm rounded-[14px] border-2 border-ink bg-surface p-6 shadow-kit"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-black tracking-tight text-ink">
          Configuration
        </h2>

        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-ink">
            Afficher tournoi en cours
          </span>
          <input
            type="checkbox"
            checked={settings.showLiveOnly}
            onChange={(e) =>
              dispatch(updateSettings({ showLiveOnly: e.target.checked }))
            }
            className="h-4 w-4 accent-teal"
          />
        </label>

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="text-sm text-ink">
            Nombre d'équipes suggérées
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Diminuer"
              onClick={() =>
                dispatch(
                  updateSettings({
                    suggestedTeamCount: Math.max(
                      MIN_TEAMS,
                      settings.suggestedTeamCount - 1,
                    ),
                  }),
                )
              }
              className="h-8 w-8 rounded-[10px] border-2 border-ink bg-surface text-ink shadow-kit hover:bg-teal"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold text-ink">
              {settings.suggestedTeamCount}
            </span>
            <button
              type="button"
              aria-label="Augmenter"
              onClick={() =>
                dispatch(
                  updateSettings({
                    suggestedTeamCount: Math.min(
                      MAX_TEAMS,
                      settings.suggestedTeamCount + 1,
                    ),
                  }),
                )
              }
              className="h-8 w-8 rounded-[10px] border-2 border-ink bg-surface text-ink shadow-kit hover:bg-teal"
            >
              +
            </button>
          </div>
        </div>

        <label className="mt-5 block text-sm text-ink">
          Continent
          <select
            value={settings.continent}
            onChange={(e) =>
              dispatch(
                updateSettings({
                  continent: e.target.value as Settings['continent'],
                }),
              )
            }
            className="mt-1 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal"
          >
            <option value="ALL">Tous les continents</option>
            {CONTINENTS.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-5 block text-sm text-ink">
          Temps de rafraîchissement (secondes)
          <input
            type="number"
            min={15}
            max={3600}
            value={settings.refreshIntervalSeconds}
            onChange={(e) => {
              const value = e.target.value === '' ? 15 : Number(e.target.value)
              if (!Number.isFinite(value)) return
              dispatch(updateSettings({ refreshIntervalSeconds: value }))
            }}
            className="mt-1 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal"
          />
        </label>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border-2 border-ink bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-kit hover:bg-teal"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}