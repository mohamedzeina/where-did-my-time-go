/**
 * Activity colors. They double as chart series colors, so they were validated as a
 * categorical palette against the app's Midnight surface (lightness band, chroma floor,
 * colorblind separation between neighbours, and >= 3:1 contrast). Keep the order: it is
 * what keeps neighbouring colors distinguishable for colorblind readers.
 */
export const ACTIVITY_COLORS = [
  { name: 'Blue', hex: '#3987e5' },
  { name: 'Orange', hex: '#d95926' },
  { name: 'Aqua', hex: '#199e70' },
  { name: 'Yellow', hex: '#c98500' },
  { name: 'Magenta', hex: '#d55181' },
  { name: 'Green', hex: '#008300' },
  { name: 'Violet', hex: '#9085e9' },
  { name: 'Red', hex: '#e66767' },
] as const

/** The first palette color nobody is using yet, so new activities stay distinct. */
export function nextActivityColor(used: readonly string[]): string {
  const taken = new Set(used.map((hex) => hex.toLowerCase()))
  const free = ACTIVITY_COLORS.find((color) => !taken.has(color.hex))
  return (free ?? ACTIVITY_COLORS[used.length % ACTIVITY_COLORS.length]).hex
}
