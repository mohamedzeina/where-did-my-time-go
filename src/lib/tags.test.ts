import { describe, expect, it } from 'vitest'
import { MAX_TAG_LENGTH, normalizeTag, normalizeTags, splitTags } from './tags'

describe('normalizeTag', () => {
  it('lowercases, drops the hash and joins words with hyphens', () => {
    expect(normalizeTag('  #ClientA ')).toBe('clienta')
    expect(normalizeTag('##Deep Focus')).toBe('deep-focus')
    expect(normalizeTag('a, b')).toBe('a-b')
  })

  it('cuts long tags and leaves nothing of a bare hash', () => {
    expect(normalizeTag('x'.repeat(50))).toHaveLength(MAX_TAG_LENGTH)
    expect(normalizeTag('#')).toBe('')
  })
})

describe('normalizeTags', () => {
  it('drops empty tags and duplicates, keeping the first order', () => {
    expect(normalizeTags(['Work', '#', 'urgent', '#work'])).toEqual(['work', 'urgent'])
  })
})

describe('splitTags', () => {
  it('splits on spaces and commas', () => {
    expect(splitTags('#a, b  c,,')).toEqual(['a', 'b', 'c'])
  })
})
