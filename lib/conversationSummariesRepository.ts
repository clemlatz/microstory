import { randomUUID } from 'node:crypto'
import { getDb } from './db'
import type { ConversationSummaryRecord } from './types'

type ConversationSummaryRow = {
  id: string
  content: string
  cutoffMessageId: string
  createdAt: number
  type: ConversationSummaryRecord['type']
}

/**
 * Appends one entry to the full history of every summary ever generated and
 * persisted as *the* current compaction summary (see
 * lib/settingsRepository.ts's `setConversationSummary`) — called right
 * alongside every `setConversationSummary` call site (the automatic
 * compaction in lib/conversationCompaction.ts, and the manual "Utiliser
 * comme contexte" persistence in app/api/conversation-summary/route.ts), so
 * the history view (issue #36) can show every summary at its position,
 * unlike `settings.conversationSummary` which only ever holds the current
 * one. Scoped by `storyId` so each story keeps its own summary history.
 */
export function addConversationSummary(
  content: string,
  cutoffMessageId: string,
  type: ConversationSummaryRecord['type'],
  storyId: string,
): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO conversation_summaries (id, content, cutoff_message_id, created_at, type, story_id)
     VALUES (@id, @content, @cutoffMessageId, @createdAt, @type, @storyId)`,
  ).run({
    id: randomUUID(),
    content,
    cutoffMessageId,
    createdAt: Date.now(),
    type,
    storyId,
  })
}

export function getAllConversationSummaries(storyId: string): ConversationSummaryRecord[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, content, cutoff_message_id AS cutoffMessageId, created_at AS createdAt, type
       FROM conversation_summaries
       WHERE story_id = ?
       ORDER BY created_at ASC`,
    )
    .all(storyId) as ConversationSummaryRow[]
}

/** Clears the whole summary history for one story — used by "Réinitialiser la conversation" (see app/api/messages/route.ts). */
export function clearConversationSummaries(storyId: string): void {
  const db = getDb()
  db.prepare('DELETE FROM conversation_summaries WHERE story_id = ?').run(storyId)
}

/**
 * Corrects/completes the content of one previously-recorded summary (issue
 * #42), editable from the "Historique" view regardless of whether it's the
 * currently-active one. Returns the updated record, or `null` if `id`
 * doesn't match any row for this `storyId` (so the route handler can 404).
 * Only `content` changes — `cutoffMessageId`/`createdAt`/`type` describe
 * when/how the summary was originally produced and stay untouched by an
 * edit.
 */
export function updateConversationSummary(
  id: string,
  storyId: string,
  content: string,
): ConversationSummaryRecord | null {
  const db = getDb()
  const existing = db
    .prepare(
      `SELECT cutoff_message_id AS cutoffMessageId, created_at AS createdAt, type
       FROM conversation_summaries WHERE id = ? AND story_id = ?`,
    )
    .get(id, storyId) as Omit<ConversationSummaryRow, 'id' | 'content'> | undefined
  if (!existing) return null

  db.prepare('UPDATE conversation_summaries SET content = @content WHERE id = @id AND story_id = @storyId').run({
    id,
    storyId,
    content,
  })

  return { id, content, ...existing }
}
