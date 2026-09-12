import { NextResponse } from 'next/server'
import {
  updateConversationSummary,
  getAllConversationSummaries,
} from '@/lib/conversationSummariesRepository'
import { getConversationSummary, setConversationSummary } from '@/lib/settingsRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

/**
 * Edits one previously-recorded summary from the "Historique" view (issue
 * #42) — `lib/conversationSummariesRepository.ts` previously only supported
 * appending new entries, with no way to correct/complete one after the
 * fact.
 *
 * The active summary (the one `lib/conversationCompaction.ts` actually
 * sends to the LLM on the next turn) is duplicated between
 * `conversation_summaries` (this history table) and
 * `settings.conversationSummary` (see `lib/settingsRepository.ts`'s
 * `getConversationSummary`/`setConversationSummary`) — mirroring
 * `HistoryView`'s own `isActive` derivation (the most recently created
 * summary, when its cutoff still matches the settings cutoff), if the
 * edited summary is that one, the settings copy is updated too so the very
 * next turn's prompt reflects the edit.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error
  const { storyId } = storyIdResult

  const { id } = await context.params
  const body = await request.json()
  if (typeof body?.content !== 'string' || body.content.trim().length === 0) {
    return NextResponse.json({ error: 'content must be a non-empty string' }, { status: 400 })
  }
  const content = body.content.trim()

  const summary = updateConversationSummary(id, storyId, content)
  if (!summary) {
    return NextResponse.json({ error: 'summary not found' }, { status: 404 })
  }

  const allSummaries = getAllConversationSummaries(storyId)
  const lastSummary = allSummaries[allSummaries.length - 1]
  const { cutoffId } = getConversationSummary(storyId)
  if (lastSummary && lastSummary.id === id && lastSummary.cutoffMessageId === cutoffId) {
    setConversationSummary(storyId, content, lastSummary.cutoffMessageId)
  }

  return NextResponse.json({ summary })
}
