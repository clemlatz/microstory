import { randomUUID } from 'node:crypto'
import { getDb } from './db'
import type { Story } from './types'

type StoryRow = {
  id: string
  title: string
  presentation: string
  created_at: number
  updated_at: number
}

function toStory(row: StoryRow): Story {
  return {
    id: row.id,
    title: row.title,
    presentation: row.presentation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getAllStories(): Story[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT id, title, presentation, created_at, updated_at FROM stories ORDER BY updated_at DESC')
    .all() as StoryRow[]
  return rows.map(toStory)
}

export function getStoryById(id: string): Story | null {
  const db = getDb()
  const row = db
    .prepare('SELECT id, title, presentation, created_at, updated_at FROM stories WHERE id = ?')
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

  return { id, title, presentation: '', createdAt: now, updatedAt: now }
}

export function renameStory(id: string, title: string): Story | null {
  const existing = getStoryById(id)
  if (!existing) return null

  const db = getDb()
  db.prepare('UPDATE stories SET title = @title WHERE id = @id').run({ id, title })

  return { ...existing, title }
}

export function updateStoryPresentation(id: string, presentation: string): Story | null {
  const existing = getStoryById(id)
  if (!existing) return null

  const db = getDb()
  db.prepare('UPDATE stories SET presentation = @presentation WHERE id = @id').run({ id, presentation })

  return { ...existing, presentation }
}

export function deleteStory(id: string): void {
  const db = getDb()
  const transaction = db.transaction((storyId: string) => {
    db.prepare('DELETE FROM character_versions WHERE story_id = ?').run(storyId)
    db.prepare('DELETE FROM characters WHERE story_id = ?').run(storyId)
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
 * (characters with no story_id), create a default story and reattach them
 * to it. No-ops once at least one story exists.
 */
export function ensureDefaultStory(): void {
  const db = getDb()
  const storyCount = (db.prepare('SELECT COUNT(*) AS n FROM stories').get() as { n: number }).n
  if (storyCount > 0) return

  const hasLegacyData =
    (db.prepare('SELECT COUNT(*) AS n FROM characters WHERE story_id IS NULL').get() as { n: number })
      .n > 0
  if (!hasLegacyData) return

  const transaction = db.transaction(() => {
    const id = randomUUID()
    const now = Date.now()
    db.prepare(
      'INSERT INTO stories (id, title, created_at, updated_at) VALUES (@id, @title, @createdAt, @updatedAt)',
    ).run({ id, title: 'Histoire 1', createdAt: now, updatedAt: now })

    db.prepare('UPDATE characters SET story_id = ? WHERE story_id IS NULL').run(id)

    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('currentStoryId', @id) ON CONFLICT(key) DO UPDATE SET value = @id",
    ).run({ id })
  })
  transaction()
}
