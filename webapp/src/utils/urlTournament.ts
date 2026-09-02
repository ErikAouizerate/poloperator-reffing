export const TOURNAMENT_URL_PARAM = 'tournament'

export function parseSlugFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)
  const slug = params.get(TOURNAMENT_URL_PARAM)
  return slug && slug.length > 0 ? slug : null
}

export function buildSearchWithSlug(
  search: string,
  slug: string | null,
): string {
  const params = new URLSearchParams(search)
  if (slug) {
    params.set(TOURNAMENT_URL_PARAM, slug)
  } else {
    params.delete(TOURNAMENT_URL_PARAM)
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

export function syncTournamentSlug(slug: string | null): void {
  if (typeof window === 'undefined' || typeof history === 'undefined') return
  try {
    const search = buildSearchWithSlug(window.location.search, slug)
    history.replaceState(null, '', window.location.pathname + search + window.location.hash)
  } catch {
    // URL/history API unavailable — the URL stays as-is.
  }
}
