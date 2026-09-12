/**
 * Builds the system-prompt instruction asking the model to cap the length of
 * generated fiction (the [TEXTE] channel only — [CHAT] remarks are
 * unaffected). This is a best-effort instruction, not an enforced
 * constraint: there is no structured output or server-side truncation, so
 * the model may still exceed it (see issue #17).
 */
export function buildStoryWordLimitMessage(maxStoryWords: number): string {
  return `In the [TEXTE] channel, write at most ${maxStoryWords} words (you may write fewer). This limit does not apply to the [CHAT] channel.`
}
