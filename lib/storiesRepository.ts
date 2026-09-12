import { randomUUID } from 'node:crypto'
import { getDb } from './db'
import { parseChanneledContent } from './channeledContent'
import type { Story } from './types'

type StoryRow = {
  id: string
  title: string
  created_at: number
  updated_at: number
}

const PREVIEW_LENGTH = 120

function lastPassagePreview(storyId: string): string | null {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT content FROM messages
       WHERE story_id = ? AND role = 'assistant'
       ORDER BY timestamp DESC LIMIT 1`,
    )
    .get(storyId) as { content: string } | undefined
  if (!row) return null

  const story = parseChanneledContent(row.content).story.trim()
  if (!story) return null

  return story.length > PREVIEW_LENGTH ? `${story.slice(0, PREVIEW_LENGTH)}…` : story
}

function toStory(row: StoryRow): Story {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastPassagePreview: lastPassagePreview(row.id),
  }
}

export function getAllStories(): Story[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT id, title, created_at, updated_at FROM stories ORDER BY updated_at DESC')
    .all() as StoryRow[]
  return rows.map(toStory)
}

export function getStoryById(id: string): Story | null {
  const db = getDb()
  const row = db
    .prepare('SELECT id, title, created_at, updated_at FROM stories WHERE id = ?')
    .get(id) as StoryRow | undefined
  return row ? toStory(row) : null
}

export function createStory(title: string): Story {
  const db = getDb()
  const id = randomUUID()
  const now = Date.now()

  db.prepare(
    'INSERT INTO stories (id, title, created_at, updated_at) VALUES (@id, @title, @createdAt, @updatedAt)',
  ).run({ id, title, createdAt: now, updatedAt: now })

  return { id, title, createdAt: now, updatedAt: now, lastPassagePreview: null }
}

export function renameStory(id: string, title: string): Story | null {
  const existing = getStoryById(id)
  if (!existing) return null

  const db = getDb()
  db.prepare('UPDATE stories SET title = @title WHERE id = @id').run({ id, title })

  return { ...existing, title }
}

export function deleteStory(id: string): void {
  const db = getDb()
  const transaction = db.transaction((storyId: string) => {
    db.prepare('DELETE FROM messages WHERE story_id = ?').run(storyId)
    db.prepare('DELETE FROM character_versions WHERE story_id = ?').run(storyId)
    db.prepare('DELETE FROM characters WHERE story_id = ?').run(storyId)
    db.prepare('DELETE FROM conversation_summaries WHERE story_id = ?').run(storyId)
    db.prepare("DELETE FROM settings WHERE key LIKE ? ESCAPE '\\'").run(
      `${storyId.replace(/[%_\\]/g, '\\$&')}:%`,
    )
    db.prepare('DELETE FROM stories WHERE id = ?').run(storyId)
  })
  transaction(id)
}

export function touchStory(id: string): void {
  const db = getDb()
  db.prepare('UPDATE stories SET updated_at = ? WHERE id = ?').run(Date.now(), id)
}

/** A plain existence check, used by app/page.tsx before redirecting to a story. */
export function storyExists(id: string): boolean {
  const db = getDb()
  const row = db.prepare('SELECT 1 FROM stories WHERE id = ?').get(id)
  return row !== undefined
}

/**
 * One-shot migration: if no story exists yet but pre-multi-story data does
 * (messages/characters/settings with no story_id, or unprefixed
 * writerPrompt/conversationSummary keys), create a default story and
 * reattach everything to it. No-ops once at least one story exists.
 */
export function ensureDefaultStory(): void {
  const db = getDb()
  const storyCount = (db.prepare('SELECT COUNT(*) AS n FROM stories').get() as { n: number }).n
  if (storyCount > 0) return

  const hasLegacyData =
    (db.prepare('SELECT COUNT(*) AS n FROM messages WHERE story_id IS NULL').get() as { n: number }).n >
      0 ||
    (db.prepare('SELECT COUNT(*) AS n FROM characters WHERE story_id IS NULL').get() as { n: number })
      .n > 0 ||
    (
      db
        .prepare('SELECT COUNT(*) AS n FROM conversation_summaries WHERE story_id IS NULL')
        .get() as { n: number }
    ).n > 0 ||
    (db.prepare("SELECT COUNT(*) AS n FROM settings WHERE key = 'writerPrompt'").get() as {
      n: number
    }).n > 0 ||
    (db.prepare("SELECT COUNT(*) AS n FROM settings WHERE key = 'conversationSummary'").get() as {
      n: number
    }).n > 0
  if (!hasLegacyData) return

  const transaction = db.transaction(() => {
    const id = randomUUID()
    const now = Date.now()
    db.prepare(
      'INSERT INTO stories (id, title, created_at, updated_at) VALUES (@id, @title, @createdAt, @updatedAt)',
    ).run({ id, title: 'Histoire 1', createdAt: now, updatedAt: now })

    db.prepare('UPDATE messages SET story_id = ? WHERE story_id IS NULL').run(id)
    db.prepare('UPDATE characters SET story_id = ? WHERE story_id IS NULL').run(id)
    db.prepare('UPDATE conversation_summaries SET story_id = ? WHERE story_id IS NULL').run(id)

    for (const legacyKey of ['writerPrompt', 'conversationSummary', 'conversationSummaryCutoffId']) {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(legacyKey) as
        | { value: string }
        | undefined
      if (!row) continue
      db.prepare(
        'INSERT INTO settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = @value',
      ).run({ key: `${id}:${legacyKey}`, value: row.value })
      db.prepare('DELETE FROM settings WHERE key = ?').run(legacyKey)
    }

    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('currentStoryId', @id) ON CONFLICT(key) DO UPDATE SET value = @id",
    ).run({ id })
  })
  transaction()
}
