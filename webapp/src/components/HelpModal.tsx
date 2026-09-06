import { useEffect } from 'react'
import { TIER_BG, TIER_LABEL } from './tierStyles'

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

function TierBadge({ tier }: { tier: 1 | 2 | 3 | 4 }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-md border-2 border-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink ${TIER_BG[tier]}`}
    >
      {TIER_LABEL[tier]}
    </span>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
      {children}
    </h3>
  )
}

export function HelpModal({ open, onClose }: HelpModalProps) {
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
      aria-label="Aide"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[14px] border-2 border-ink bg-surface p-6 shadow-kit"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-black tracking-tight text-ink">
          Comment ça marche ?
        </h2>

        <section>
          <SectionTitle>Les niveaux de suggestion</SectionTitle>
          <p className="mt-2 text-sm text-ink">
            Règle de base : une équipe qui joue à la vague T arbitre deux
            vagues avant (T−2) et se repose à T−1. L'application propose,
            l'organisateur décide.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            <li className="flex items-start gap-2">
              <TierBadge tier={1} />
              <span>
                L'équipe joue dans 2 vagues (T+2) : arbitrer maintenant
                préserve son créneau de repos avant le match.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <TierBadge tier={2} />
              <span>L'équipe joue dans 3 vagues (T+3).</span>
            </li>
            <li className="flex items-start gap-2">
              <TierBadge tier={3} />
              <span>
                Pas de match proche connu (équipe éliminée, fin de journée,
                prochain match dans 4 vagues ou plus). Les équipes ayant joué
                il y a exactement 2 vagues passent en premier : c'est leur
                tour d'arbitrer.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <TierBadge tier={4} />
              <span>
                « Chaîne » : l'équipe joue à la vague suivante (T+1) ou vient
                juste de jouer (T−1) — pas de repos entre match et arbitrage.
              </span>
            </li>
          </ul>
          <p className="mt-2 text-sm text-muted">
            À niveau égal, l'équipe qui a le moins arbitré passe en premier,
            puis celle qui attend depuis le plus longtemps.
          </p>
        </section>

        <section className="mt-5">
          <SectionTitle>Plusieurs arbitres</SectionTitle>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
            <li>
              Deux matchs en parallèle n'ont jamais la même équipe comme
              première suggestion.
            </li>
            <li>
              Sur un match terminé, si l'arbitre et le co-arbitre appartiennent
              à des équipes différentes, chaque équipe prend +1 au compteur
              d'arbitrage (même équipe : un seul +1).
            </li>
          </ul>
        </section>

        <section className="mt-5">
          <SectionTitle>Rafraîchissement</SectionTitle>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
            <li>
              Les données se rafraîchissent automatiquement toutes les
              4 minutes (réglable de 15 s à 60 min via le bouton ⚙).
            </li>
            <li>
              Le bouton « Rafraîchir » affiche le compte à rebours ; cliquer
              dessus rafraîchit immédiatement et relance le timer.
            </li>
            <li>
              Suggestions et compteurs d'arbitrage sont recalculés à chaque
              rafraîchissement, à partir des données de poloperator.com.
            </li>
          </ul>
        </section>

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
