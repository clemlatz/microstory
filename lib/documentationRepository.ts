import { randomUUID } from 'node:crypto'
import { getDb } from './db'
import { VERSION_GROUPING_WINDOW_MS } from './versionGroupingWindow'
import type { DocumentationEntry } from './types'

type DocumentationRow = {
  id: string
  title: string
  content: string
  url: string | null
  created_at: number
  updated_at: number
}

function toDocumentationEntry(row: DocumentationRow): DocumentationEntry {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type DocumentationInput = {
  title: string
  content: string
  url?: string | null
}

export function getAllDocumentationEntries(storyId: string): DocumentationEntry[] {
  const db = getDb()
  const rows = db
    .prepare(
      'SELECT id, title, content, url, created_at, updated_at FROM documentation WHERE story_id = ? ORDER BY created_at ASC',
    )
    .all(storyId) as DocumentationRow[]
  return rows.map(toDocumentationEntry)
}

export function getDocumentationEntryById(id: string, storyId: string): DocumentationEntry | null {
  const db = getDb()
  const row = db
    .prepare(
      'SELECT id, title, content, url, created_at, updated_at FROM documentation WHERE id = ? AND story_id = ?',
    )
    .get(id, storyId) as DocumentationRow | undefined
  return row ? toDocumentationEntry(row) : null
}

export function createDocumentationEntry(
  input: DocumentationInput,
  storyId: string,
): DocumentationEntry {
  const db = getDb()
  const now = Date.now()
  const id = randomUUID()
  const url = input.url ?? null

  db.prepare(
    `INSERT INTO documentation (id, title, content, url, created_at, updated_at, story_id)
     VALUES (@id, @title, @content, @url, @createdAt, @updatedAt, @storyId)`,
  ).run({
    id,
    title: input.title,
    content: input.content,
    url,
    createdAt: now,
    updatedAt: now,
    storyId,
  })

  return { id, title: input.title, content: input.content, url, createdAt: now, updatedAt: now }
}

export function updateDocumentationEntry(
  id: string,
  storyId: string,
  input: DocumentationInput,
): DocumentationEntry | null {
  const db = getDb()
  const existing = getDocumentationEntryById(id, storyId)
  if (!existing) return null

  const updatedAt = Date.now()
  const url = input.url ?? null

  const lastVersion = db
    .prepare(
      'SELECT created_at FROM documentation_versions WHERE documentation_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(id) as { created_at: number } | undefined
  const isSameEditingSession =
    lastVersion !== undefined && updatedAt - lastVersion.created_at < VERSION_GROUPING_WINDOW_MS
  if (!isSameEditingSession) {
    db.prepare(
      `INSERT INTO documentation_versions (id, documentation_id, story_id, title, content, url, created_at)
       VALUES (@id, @documentationId, @storyId, @title, @content, @url, @createdAt)`,
    ).run({
      id: randomUUID(),
      documentationId: id,
      storyId,
      title: existing.title,
      content: existing.content,
      url: existing.url,
      createdAt: updatedAt,
    })
  }

  db.prepare(
    'UPDATE documentation SET title = @title, content = @content, url = @url, updated_at = @updatedAt WHERE id = @id AND story_id = @storyId',
  ).run({
    id,
    storyId,
    title: input.title,
    content: input.content,
    url,
    updatedAt,
  })

  return { ...existing, title: input.title, content: input.content, url, updatedAt }
}

export function deleteDocumentationEntry(id: string, storyId: string): void {
  const db = getDb()
  db.prepare('DELETE FROM documentation_versions WHERE documentation_id = ? AND story_id = ?').run(
    id,
    storyId,
  )
  db.prepare('DELETE FROM documentation WHERE id = ? AND story_id = ?').run(id, storyId)
}
