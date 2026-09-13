import { describe, expect, it } from 'vitest'
import type { Session } from '../db/types'
import { isEmptySearch, matchesSearch, parseSearch } from './search'

const session = (note: string, tags: string[] = []): Session => ({
  id: 's',
  activityId: 'a',
  start: 0,
  end: 1,
  note,
  tags,
})

const matches = (query: string, s: Session, activityName = 'Deep work') =>
  matchesSearch(s, activityName, parseSearch(query))

describe('parseSearch', () => {
  it('separates tags from words and ignores a bare hash', () => {
    expect(parseSearch('  #ClientA  Report # ')).toEqual({ tags: ['clienta'], words: ['report'] })
    expect(isEmptySearch(parseSearch(' # '))).toBe(true)
  })
})

describe('matchesSearch', () => {
  it('matches everything when empty', () => {
    expect(matches('', session(''))).toBe(true)
  })

  it('finds words in the note, the activity name or a tag, ignoring case', () => {
    expect(matches('quarterly', session('Quarterly report'))).toBe(true)
    expect(matches('deep', session(''))).toBe(true)
    expect(matches('client', session('', ['clienta']))).toBe(true)
    expect(matches('invoice', session('Quarterly report'))).toBe(false)
  })

  it('needs every word', () => {
    expect(matches('quarterly deep', session('Quarterly report'))).toBe(true)
    expect(matches('quarterly gym', session('Quarterly report'))).toBe(false)
  })

  it('matches #tags exactly rather than as text', () => {
    expect(matches('#clienta', session('', ['clienta']))).toBe(true)
    expect(matches('#client', session('', ['clienta']))).toBe(false)
    expect(matches('#clienta', session('about clienta'))).toBe(false)
    expect(matches('#clienta report', session('Report', ['clienta']))).toBe(true)
  })
})
