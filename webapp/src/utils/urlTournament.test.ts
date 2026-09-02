import { describe, expect, it } from 'vitest'
import { buildSearchWithSlug, parseSlugFromSearch } from './urlTournament'

describe('parseSlugFromSearch', () => {
  it('returns null when the param is absent', () => {
    expect(parseSlugFromSearch('')).toBeNull()
    expect(parseSlugFromSearch('?continent=EU')).toBeNull()
  })

  it('returns the slug when present alone', () => {
    expect(parseSlugFromSearch('?tournament=abc')).toBe('abc')
  })

  it('returns the slug among other params', () => {
    expect(parseSlugFromSearch('?continent=EU&tournament=abc')).toBe('abc')
  })

  it('returns null for an empty value', () => {
    expect(parseSlugFromSearch('?tournament=')).toBeNull()
  })
})

describe('buildSearchWithSlug', () => {
  it('adds the param to an empty search', () => {
    expect(buildSearchWithSlug('', 'abc')).toBe('?tournament=abc')
  })

  it('preserves other params when adding', () => {
    expect(buildSearchWithSlug('?continent=EU', 'abc')).toBe(
      '?continent=EU&tournament=abc',
    )
  })

  it('replaces an existing value', () => {
    expect(buildSearchWithSlug('?tournament=old', 'new')).toBe(
      '?tournament=new',
    )
  })

  it('removes the param when clearing, preserving others', () => {
    expect(buildSearchWithSlug('?tournament=abc&x=1', null)).toBe('?x=1')
  })

  it('returns empty string when clearing from empty search', () => {
    expect(buildSearchWithSlug('', null)).toBe('')
  })
})