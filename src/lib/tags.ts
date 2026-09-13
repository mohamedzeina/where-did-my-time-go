/** Longer tags are cut to this, so one pasted sentence can't become a tag. */
export const MAX_TAG_LENGTH = 32

/**
 * One tag as it's stored: lowercase, without a leading `#`, and with spaces and commas turned
 * into hyphens, so `#ClientA`, `clienta` and ` ClientA ` are the same tag. May come back empty.
 */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[\s,]+/g, '-')
    .slice(0, MAX_TAG_LENGTH)
}

/** Tags as they're stored: each normalized, empty ones dropped, first occurrence kept. */
export function normalizeTags(raw: readonly string[]): string[] {
  return [...new Set(raw.map(normalizeTag).filter(Boolean))]
}

/** Splits typed or pasted text on spaces and commas into tags. */
export function splitTags(text: string): string[] {
  return normalizeTags(text.split(/[\s,]+/))
}
