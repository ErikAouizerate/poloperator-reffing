import type { TournamentSummary } from '../../types/poloperator'
import {
  extractTournamentRosters,
  extractTournaments,
  parseRscStream,
  type TournamentRosters,
} from './parseRsc'

/**
 * poloperator.com does not send CORS headers, so the browser cannot fetch it
 * directly. The app calls a same-origin path that is proxied:
 * - dev: Vite `server.proxy` (vite.config.ts)
 * - prod: nginx `proxy_pass` (nginx.conf)
 * Override with VITE_POLOPERATOR_BASE to fetch a mirror directly if CORS
 * ever becomes permissive.
 */
const BASE = import.meta.env.VITE_POLOPERATOR_BASE ?? '/poloperator'

const RSC_HEADERS: Record<string, string> = {
  accept: '*/*',
  rsc: '1',
}

async function fetchRsc(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, { headers: RSC_HEADERS })
  if (!res.ok) {
    throw new Error(`poloperator ${path} → ${res.status} ${res.statusText}`)
  }
  return res.text()
}

/** Load the public list of all tournaments. */
export async function loadTournaments(): Promise<TournamentSummary[]> {
  const text = await fetchRsc('/fr/tournaments')
  return extractTournaments(parseRscStream(text))
}

/** Load teams + matches for a tournament from its public schedule page. */
export async function loadTournamentSchedule(slug: string): Promise<TournamentRosters> {
  const path = `/fr/tournament/${encodeURIComponent(slug)}?tab=schedule`
  const text = await fetchRsc(path)
  return extractTournamentRosters(parseRscStream(text))
}