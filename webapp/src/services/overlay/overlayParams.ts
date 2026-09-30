import { TOURNAMENT_URL_PARAM } from '../../utils/urlTournament'

export const DEFAULT_COURT = '1'
export const DEFAULT_THEME = 'dark'

export interface OverlayParams {
  tournament: string | null
  court: string
  theme: string
}

/** Read `/overlay` query params, applying court/theme defaults. */
export function parseOverlayParams(search: string): OverlayParams {
  const params = new URLSearchParams(search)
  const slug = params.get(TOURNAMENT_URL_PARAM)
  return {
    tournament: slug && slug.length > 0 ? slug : null,
    court: params.get('court') || DEFAULT_COURT,
    theme: params.get('theme') || DEFAULT_THEME,
  }
}

/**
 * Upstream poloperator overlay path (no `/poloperator` proxy prefix — the
 * caller adds it). Returns null when no tournament was provided.
 */
export function buildOverlayPath(params: OverlayParams): string | null {
  if (!params.tournament) return null
  const tournament = encodeURIComponent(params.tournament)
  const court = encodeURIComponent(params.court)
  const theme = encodeURIComponent(params.theme)
  return `/fr/tournament/${tournament}/overlay?court=${court}&theme=${theme}`
}
