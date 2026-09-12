/**
 * Cheap token estimate (chars/4) used wherever an exact server-side count
 * isn't available — a local server that hasn't responded, or a hosted
 * provider that doesn't expose a token-counting endpoint at all.
 */
export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4)
}
