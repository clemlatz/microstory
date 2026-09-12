import { streamLlmReply } from '@/lib/llmClient'
import { buildConversationSummaryMessages } from '@/lib/conversationSummaryPrompt'
import { encodeChatStreamEvent } from '@/lib/chatStreamProtocol'
import { getRepetitionPenalty, getConversationSummary, getVerbatimWindowWords } from '@/lib/settingsRepository'
import { getAllMessages } from '@/lib/messagesRepository'
import { messagesAfterCutoff } from '@/lib/conversationCompaction'
import { selectMessagesToFold } from '@/lib/conversationSummaryFold'
import { toSummaryEntries } from '@/lib/conversationSummaryEntries'
import { requireExistingStoryId } from '@/lib/requestStoryId'
import { NextResponse } from 'next/server'

/**
 * Builds the manual "Résumer" summary incrementally (issue #58) rather than
 * regenerating it from the whole manuscript on every click: the currently
 * persisted summary (`getConversationSummary`) is passed as
 * `previousSummary`. What gets folded in is not simply "everything since
 * `cutoffId`" any more — since the Couche 3 verbatim window
 * (lib/verbatimWindow.ts) was introduced, the trailing messages that still
 * fit within that window are deliberately excluded
 * (`selectMessagesToFold`, lib/conversationSummaryFold.ts), so a manual
 * "Résumer" click folds exactly the same content the automatic trigger
 * (lib/autoSummaryTrigger.ts) would — everything pending except the
 * window. A first-ever call (no summary persisted yet, `cutoffId` null)
 * naturally starts from the entire manuscript, same as before this issue,
 * still excluding the trailing window from what gets folded.
 *
 * Both user prompts and generated ([TEXTE]) passages are included, in their
 * real chronological order (issue #59) — a prompt often carries an intention
 * or directive ("have the character discover...") that is never
 * reformulated verbatim in the generated text, and would otherwise be
 * silently dropped from the summary. See `lib/conversationSummaryEntries.ts`'s
 * `toSummaryEntries` for that mapping.
 */
export async function POST(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error
  const { storyId } = storyIdResult

  const { summary: previousSummary, cutoffId } = getConversationSummary(storyId)
  const messages = getAllMessages(storyId)

  const pending = messagesAfterCutoff(messages, cutoffId)
  const toFold = selectMessagesToFold(pending, getVerbatimWindowWords())
  const newEntries = toSummaryEntries(toFold)

  if (newEntries.length === 0) {
    return NextResponse.json({ error: 'no new passages to summarize' }, { status: 400 })
  }

  // Reuses the exact same summarization prompt as the automatic conversation
  // compaction (lib/conversationCompaction.ts) so both produce text of the
  // same character. Nothing here is persisted by this route itself — the
  // client persists the accumulated result once streaming finishes (see
  // ChatWindow's handleSummarize / app/api/conversation-summary/route.ts).
  const messagesForLlm = buildConversationSummaryMessages(previousSummary, newEntries)

  const generator = streamLlmReply(messagesForLlm, request.signal, {
    repetitionPenalty: getRepetitionPenalty(),
  })
  let firstChunk: IteratorResult<string, void>

  try {
    firstChunk = await generator.next()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to summarize text' },
      { status: 502 },
    )
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let next = firstChunk

        while (!next.done) {
          controller.enqueue(encodeChatStreamEvent({ type: 'chunk', text: next.value }))
          next = await generator.next()
        }
      } catch (error) {
        if (!request.signal.aborted) {
          const message = error instanceof Error ? error.message : 'Failed to summarize text'
          controller.enqueue(encodeChatStreamEvent({ type: 'error', message }))
        }
      } finally {
        try {
          controller.close()
        } catch {
          // client already disconnected; nothing left to close
        }
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
}
