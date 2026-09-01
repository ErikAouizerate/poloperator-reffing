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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Configuration"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-semibold text-neutral-100">
          Configuration
        </h2>

        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-200">
            Afficher tournoi en cours
          </span>
          <input
            type="checkbox"
            checked={settings.showLiveOnly}
            onChange={(e) =>
              dispatch(updateSettings({ showLiveOnly: e.target.checked }))
            }
            className="h-4 w-4 accent-teal-500"
          />
        </label>

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-200">
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
              className="h-8 w-8 rounded border border-neutral-700 text-neutral-300 hover:border-teal-500 hover:text-teal-400"
            >
              −
            </button>
            <span className="w-8 text-center text-sm text-neutral-100">
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
              className="h-8 w-8 rounded border border-neutral-700 text-neutral-300 hover:border-teal-500 hover:text-teal-400"
            >
              +
            </button>
          </div>
        </div>

        <label className="mt-5 block text-sm text-neutral-200">
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
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-teal-500"
          >
            <option value="ALL">Tous les continents</option>
            {CONTINENTS.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-teal-500 hover:text-teal-400"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}