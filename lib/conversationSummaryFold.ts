import { splitByWordCount } from './verbatimWindow'
import type { Message } from './types'

/**
 * The messages in `pending` that fall outside the trailing verbatim window
 * (see lib/verbatimWindow.ts's splitByWordCount) — i.e. what should be
 * folded into the rolling conversation summary, leaving the window's worth
 * of the most recent content unsummarized. Empty when everything in
 * `pending` already fits in the window. Shared by the automatic summary
 * trigger (lib/autoSummaryTrigger.ts) and the manual "Résumer" flow, so
 * both fold the same content.
 */
export function selectMessagesToFold(pending: Message[], verbatimWindowWords: number): Message[] {
  const kept = splitByWordCount(pending, verbatimWindowWords)
  return pending.slice(0, pending.length - kept.length)
}
