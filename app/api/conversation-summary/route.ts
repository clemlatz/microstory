import { NextResponse } from 'next/server'
import { getConversationSummary, setConversationSummary, getVerbatimWindowWords } from '@/lib/settingsRepository'
import { addConversationSummary } from '@/lib/conversationSummariesRepository'
import { getAllMessages } from '@/lib/messagesRepository'
import { messagesAfterCutoff } from '@/lib/conversationCompaction'
import { selectMessagesToFold } from '@/lib/conversationSummaryFold'
import { requireExistingStoryId } from '@/lib/requestStoryId'
import { countWords } from '@/lib/verbatimWindow'
import { logInfo } from '@/lib/logger'

/**
 * Reads the current compaction summary and its cutoff message id (issue
 * #47) — used by ChatWindow to tell whether that summary is now more recent
 * than the manuscript's last passage (and if so, show the summary there
 * instead of the stale passage). Deliberately lighter than `/api/history`
 * (which also loads the full message list and every past summary), since
 * this is polled/re-checked far more often than the "Historique" view is
 * opened.
 */
export async function GET(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error
  const { storyId } = storyIdResult

  return NextResponse.json(getConversationSummary(storyId))
}

/**
 * Persists a manually-generated summary (see app/api/summarize/route.ts,
 * ChatWindow's "Résumer" button) as the current compaction summary — the
 * same rolling summary lib/conversationCompaction.ts reads/writes
 * automatically. Since the Couche 3 verbatim window (lib/verbatimWindow.ts)
 * was introduced, the cutoff deliberately stops *before* that window
 * rather than at the very last message: the trailing content is meant to
 * stay verbatim, not be double-represented (once condensed here, once
 * again in clear via the window) — see docs/superpowers/specs/2026-09-03-auto-summary-design.md.
 * The cutoff is recomputed here with the same `selectMessagesToFold`
 * logic `app/api/summarize/route.ts` used to build the summary, rather
 * than trusting a client-supplied value, so it stays correct even if
 * settings changed between the two requests; a defensive fallback to the
 * very last message covers the (normally unreachable) case where nothing
 * falls outside the window.
 */
export async function PUT(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error
  const { storyId } = storyIdResult

  const body = await request.json()
  if (typeof body?.summary !== 'string' || body.summary.trim().length === 0) {
    return NextResponse.json({ error: 'summary must be a non-empty string' }, { status: 400 })
  }

  const messages = getAllMessages(storyId)

  const lastMessage = messages[messages.length - 1]
  if (!lastMessage) {
    return NextResponse.json({ error: 'no conversation history to summarize' }, { status: 400 })
  }

  const summary = body.summary.trim()
  const { cutoffId: previousCutoffId } = getConversationSummary(storyId)
  const pending = messagesAfterCutoff(messages, previousCutoffId)
  const toFold = selectMessagesToFold(pending, getVerbatimWindowWords())
  const cutoffId = toFold.length > 0 ? toFold[toFold.length - 1].id : lastMessage.id

  setConversationSummary(storyId, summary, cutoffId)
  addConversationSummary(summary, cutoffId, 'manual', storyId)
  logInfo(`[summarize] compacted summary: ${countWords(summary)} words`)

  return NextResponse.json({ ok: true })
}
