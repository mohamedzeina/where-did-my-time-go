import type { Session } from '../db/types'
import { normalizeTag } from './tags'

export interface SearchTerms {
  /** From `#tag` words: the session must carry each of these exactly. */
  tags: string[]
  /** Everything else, lowercase: each must appear in the note, a tag or the activity name. */
  words: string[]
}

/** Reads a search box: `#tag` words match tags exactly, other words match text anywhere. */
export function parseSearch(query: string): SearchTerms {
  const terms: SearchTerms = { tags: [], words: [] }
  for (const word of query.trim().split(/\s+/)) {
    if (word.startsWith('#')) {
      const tag = normalizeTag(word)
      if (tag) terms.tags.push(tag)
    } else if (word) {
      terms.words.push(word.toLowerCase())
    }
  }
  return terms
}

export const isEmptySearch = (terms: SearchTerms) =>
  terms.tags.length === 0 && terms.words.length === 0

/** Whether a session matches every term. An empty search matches everything. */
export function matchesSearch(session: Session, activityName: string, terms: SearchTerms) {
  if (!terms.tags.every((tag) => session.tags.includes(tag))) return false
  if (terms.words.length === 0) return true
  const text = [session.note, activityName, ...session.tags].join('\n').toLowerCase()
  return terms.words.every((word) => text.includes(word))
}
