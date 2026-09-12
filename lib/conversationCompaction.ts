import { getConversationSummary, getVerbatimWindowWords } from './settingsRepository'
import { splitByWordCount } from './verbatimWindow'
import type { ChatCompletionMessage } from './llmClient'
import type { Message } from './types'

/**
 * Everything strictly after the message with id `cutoffId`; the full list
 * if there is no cutoff or it can't be found (defensive — never drops
 * messages we can't account for). Still used by app/api/summarize/route.ts
 * and components/HistoryView.tsx to determine what's covered by the active
 * summary — unrelated to what getCurrentPromptMessages sends verbatim
 * below, which is now selected by word count instead (see
 * lib/verbatimWindow.ts).
 */
export function messagesAfterCutoff(messages: Message[], cutoffId: string | null): Message[] {
  if (!cutoffId) return messages
  const index = messages.findIndex((message) => message.id === cutoffId)
  return index === -1 ? messages : messages.slice(index + 1)
}

/**
 * Read-only: what would be sent to the LLM right now. `promptMessages` is
 * the trailing window of the full history that fits within the configured
 * word budget (see lib/verbatimWindow.ts), independent of the manual
 * summary's cutoffId — the two mechanisms deliberately overlap rather than
 * chain (see docs/superpowers/specs/2026-09-03-verbatim-window-design.md).
 * `systemMessages` still gets the persisted summary appended when one
 * exists. Never triggers a new compaction/summarization — reducing the
 * long-term context is still exclusively the manual "Résumer" button (see
 * app/api/summarize/route.ts).
 */
export function getCurrentPromptMessages(
  storyId: string,
  baseSystemMessages: ChatCompletionMessage[],
  messages: Message[],
): { systemMessages: ChatCompletionMessage[]; promptMessages: Message[] } {
  const { summary } = getConversationSummary(storyId)
  const promptMessages = splitByWordCount(messages, getVerbatimWindowWords())
  const systemMessages = summary ? [...baseSystemMessages, { role: 'system', content: summary }] : baseSystemMessages
  return { systemMessages, promptMessages }
}
