import { streamLlmReply } from './llmClient'
import { buildConversationSummaryMessages } from './conversationSummaryPrompt'
import {
  getConversationSummary,
  getVerbatimWindowWords,
  getAutoSummaryThresholdWords,
  getRepetitionPenalty,
  setConversationSummary,
} from './settingsRepository'
import { addConversationSummary } from './conversationSummariesRepository'
import { getAllMessages } from './messagesRepository'
import { messagesAfterCutoff } from './conversationCompaction'
import { selectMessagesToFold } from './conversationSummaryFold'
import { toSummaryEntries } from './conversationSummaryEntries'
import { countWords } from './verbatimWindow'
import { logInfo, logWarn, logError } from './logger'

const summarizingStoryIds = new Set<string>()

/**
 * Fire-and-forget: checks whether the pending (unsummarized) content has
 * crossed the configured word threshold and, if so, folds everything
 * outside the verbatim window (lib/verbatimWindow.ts) into the rolling
 * conversation summary — the automatic counterpart of the manual
 * "Résumer" button (app/api/summarize/route.ts), sharing the same
 * selection logic (lib/conversationSummaryFold.ts,
 * lib/conversationSummaryEntries.ts). Never throws: every error is caught
 * and logged, since this runs detached from any HTTP response (see
 * app/api/chat/route.ts) and must never fail the generation that
 * triggered it. A simple in-memory lock, keyed by `storyId`, prevents two
 * runs from overlapping for the same story without blocking a concurrent
 * auto-summary for a different one.
 */
export async function maybeAutoSummarize(storyId: string): Promise<void> {
  if (summarizingStoryIds.has(storyId)) return

  try {
    const { summary: previousSummary, cutoffId } = getConversationSummary(storyId)
    const messages = getAllMessages(storyId)
    const pending = messagesAfterCutoff(messages, cutoffId)

    const pendingWordCount = pending.reduce((sum, message) => sum + countWords(message.content), 0)
    if (pendingWordCount < getAutoSummaryThresholdWords()) return

    const toFold = selectMessagesToFold(pending, getVerbatimWindowWords())
    const entries = toSummaryEntries(toFold)
    if (entries.length === 0) return

    summarizingStoryIds.add(storyId)

    const messagesForLlm = buildConversationSummaryMessages(previousSummary, entries)
    let fullText = ''
    for await (const chunk of streamLlmReply(messagesForLlm, undefined, {
      repetitionPenalty: getRepetitionPenalty(),
    })) {
      fullText += chunk
    }

    const trimmed = fullText.trim()
    if (trimmed.length === 0) {
      logWarn('[autoSummary] LLM returned an empty summary; nothing persisted')
      return
    }

    const newCutoffId = toFold[toFold.length - 1].id
    setConversationSummary(storyId, trimmed, newCutoffId)
    addConversationSummary(trimmed, newCutoffId, 'auto', storyId)
    logInfo(`[autoSummary] compacted summary: ${countWords(trimmed)} words`)
  } catch (error) {
    logError('[autoSummary] failed to generate the automatic summary', error)
  } finally {
    summarizingStoryIds.delete(storyId)
  }
}
