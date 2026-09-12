import type { Message } from './types'

export function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Selects the trailing messages whose combined word count fits within
 * maxWords, walking backward from the end of `messages`. The most recent
 * message is always included in full, even alone it exceeds the budget —
 * the window is never empty when `messages` is non-empty. Result is
 * returned in chronological order.
 */
export function splitByWordCount(messages: Message[], maxWords: number): Message[] {
  if (messages.length === 0) return []

  const selected: Message[] = []
  let total = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const words = countWords(message.content)

    if (selected.length > 0 && total + words > maxWords) break

    selected.unshift(message)
    total += words
  }

  return selected
}
