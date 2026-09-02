# Tournament Slug in URL — Design

Date: 2026-09-02
Status: Approved

## Context

The webapp shows a list of tournaments filtered by settings (continent + live-only)
and lets the user pick one to see upcoming matches and referee suggestions. There is
no router — all state lives in classic Redux. Today the selected tournament cannot be
shared: the URL is always the bare app URL.

This spec adds the selected tournament as a URL query parameter so a URL can be
shared: `?tournament=<slug>`. The filters stay active at all times: if the
tournament selected from the URL does not match the current filters, it is kept in
the picker options (appended to the filtered list) so the shared URL still works
without ever disabling the configuration.

Decisions locked with the user:
- **Filter behavior**: filters stay active at all times; if the selected tournament
  (URL or manual) is hidden by the filters, it is appended to the picker options so
  it remains selectable — never a full-list fallback, so configuration always works.
- **URL sync**: `history.replaceState` (no history spam; back button does not walk
  through every selection).
- No router, no new dependency: `URLSearchParams` + `history.replaceState`.

## Behavior

### URL parameter
- Parameter name: `tournament`, value = tournament `slug`.
- Written on every tournament selection via `replaceState`; the path is preserved
  and any other query parameters are preserved.
- No slug in the URL → current behavior (nothing selected on load).

### Loading from the URL
- On mount, read the slug from the query string once.
- When the tournament list finishes loading and no tournament is selected yet, if a
  URL slug exists, resolve the summary from the **full** list (not the filtered one)
  by slug and dispatch `loadTournamentRequested({ slug, summary })`.
- A ref guard prevents re-dispatching (also after refresh, where `summary` is already
  set, and after a load error).
- Unknown / malformed slug: ignored; no auto-load; URL left untouched.

### Filter behavior
- New pure function `resolvePickerList(list, settings, selectedSlug)`:
  - `list === null` → `null`.
  - Compute `filtered = filterTournaments(list, settings)` — **filters always apply**.
  - If the selected slug is present in `filtered` (or there is no selection), return
    `filtered`.
  - Otherwise append the selected tournament (looked up in the full `list`) to
    `filtered` so it stays selectable while the filters remain active.
- Invariant: the picker always shows a list containing the selected tournament, so a
  shared URL works regardless of filter state and the `<select>` never holds a value
  absent from its options.
- Config changes (continent, live-only) always take effect on the picker; the
  selected tournament is merely kept visible even when it no longer matches.
- `TournamentPicker` itself is unchanged.

### App wiring
- `urlSlug` captured once on mount.
- `selectedSlug` passed to `resolvePickerList` and to the picker = the selected
  summary's slug (or the URL slug while nothing is selected yet).
- `handleSelect` dispatches the load and calls `syncTournamentSlug(t.slug)`.

## Files

- Create: `webapp/src/utils/urlTournament.ts` — pure `parseSlugFromSearch` /
  `buildSearchWithSlug` + guarded browser wrapper `syncTournamentSlug`.
- Create: `webapp/src/utils/urlTournament.test.ts`.
- Modify: `webapp/src/services/poloperator/filter.ts` — add `resolvePickerList`.
- Modify: `webapp/src/services/poloperator/filter.test.ts` — tests for
  `resolvePickerList`.
- Modify: `webapp/src/App.tsx` — URL read, auto-load effect, select writes URL,
  `resolvePickerList` replaces `filterTournaments`.

## Function signatures

```ts
// urlTournament.ts
export const TOURNAMENT_URL_PARAM = 'tournament'
export function parseSlugFromSearch(search: string): string | null
export function buildSearchWithSlug(search: string, slug: string | null): string
export function syncTournamentSlug(slug: string | null): void

// filter.ts
export function resolvePickerList(
  list: TournamentSummary[] | null,
  settings: Settings,
  selectedSlug: string | null,
): TournamentSummary[] | null
```

## Guarded browser access

`syncTournamentSlug` follows the existing `settingsStorage` pattern: `typeof
window` / `typeof history` checks and try/catch, so node-based tests never touch
browser globals. `parseSlugFromSearch` / `buildSearchWithSlug` are pure and take a
`search` string.

## Error handling

- History/URL API unavailable (node, sandboxed iframe): `syncTournamentSlug` is a
  no-op.
- Slug not found in list: no auto-load; existing behavior for manual picks is
  unchanged.

## Testing (vitest, node env)

- `urlTournament.test.ts`:
  - `parseSlugFromSearch` — absent, single, among other params, empty value,
    value present.
  - `buildSearchWithSlug` — add when empty, add preserving other params, replace
    existing, remove when clearing, remove preserving other params.
- `filter.test.ts` (`resolvePickerList`):
  - `list === null` → `null`.
  - no selected slug → filtered list.
  - selected slug within filters → filtered list.
  - selected slug outside filters → filtered list + selected tournament appended
    (filters stay active).

## Out of scope

- Route definitions / react-router.
- Persisting filters in the URL.
- Copy-to-clipboard "share" button.
- Clearing the URL param when the user clears selection (there is no clear action
  in the app).