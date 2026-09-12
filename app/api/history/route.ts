import { NextResponse } from 'next/server'
import { getAllMessages } from '@/lib/messagesRepository'
import { getAllConversationSummaries } from '@/lib/conversationSummariesRepository'
import { getConversationSummary } from '@/lib/settingsRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

/**
 * Backs the read-only "Historique" view (issue #36): the full message
 * history (never truncated by compaction — see CLAUDE.md's "Conversation
 * compaction"), every summary ever generated (lib/conversationSummariesRepository.ts,
 * both automatic and manual), and `activeCutoffId` — the cutoff of the
 * summary currently in effect (lib/settingsRepository.ts's
 * `getConversationSummary`), i.e. what `getCurrentPromptMessages` would
 * actually send to the LLM on the next turn. The client cross-references
 * `activeCutoffId` against `summaries` to find and highlight the active
 * summary and the verbatim messages that follow its cutoff.
 */
export async function GET(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error
  const { storyId } = storyIdResult

  const messages = getAllMessages(storyId)
  const summaries = getAllConversationSummaries(storyId)
  const { cutoffId } = getConversationSummary(storyId)

  return NextResponse.json({ messages, summaries, activeCutoffId: cutoffId })
}
