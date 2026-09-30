import type { Match } from '../../types/poloperator'
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

export interface OverlayCourt {
  /** Display name, e.g. `"Court 2"`. */
  name: string
  /** Overlay `court` query value, e.g. `"2"`. */
  court: string
}

/**
 * Distinct courts of a tournament, derived from its matches' display names.
 * The upstream payload has no courts list, only a per-match `courtName`, so
 * the overlay court number comes from its digits (`"Court 2"` → `2`); a name
 * without digits falls back to its sorted position (1-based).
 */
export function listOverlayCourts(matches: Match[]): OverlayCourt[] {
  const names = [
    ...new Set(
      matches
        .map((match) => match.courtName)
        .filter((name): name is string => Boolean(name)),
    ),
  ].sort()
  return names.map((name, index) => ({
    name,
    court: /\d+/.exec(name)?.[0] ?? String(index + 1),
  }))
}

/** This app's `/overlay` href for a tournament court (opens in a new tab). */
export function buildOverlayHref(slug: string, court: string): string {
  return `/overlay?tournament=${encodeURIComponent(slug)}&court=${encodeURIComponent(court)}`
}
