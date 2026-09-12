import { randomUUID } from 'node:crypto'
import { getDb } from './db'
import type { Note } from './types'

type NoteRow = {
  id: string
  title: string
  content: string
  created_at: number
  updated_at: number
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type NoteInput = {
  title: string
  content: string
}

export function getAllNotes(storyId: string): Note[] {
  const db = getDb()
  const rows = db
    .prepare(
      'SELECT id, title, content, created_at, updated_at FROM notes WHERE story_id = ? ORDER BY created_at ASC',
    )
    .all(storyId) as NoteRow[]
  return rows.map(toNote)
}

export function getNoteById(id: string, storyId: string): Note | null {
  const db = getDb()
  const row = db
    .prepare(
      'SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ? AND story_id = ?',
    )
    .get(id, storyId) as NoteRow | undefined
  return row ? toNote(row) : null
}

export function createNote(input: NoteInput, storyId: string): Note {
  const db = getDb()
  const now = Date.now()
  const id = randomUUID()

  db.prepare(
    `INSERT INTO notes (id, title, content, created_at, updated_at, story_id)
     VALUES (@id, @title, @content, @createdAt, @updatedAt, @storyId)`,
  ).run({
    id,
    title: input.title,
    content: input.content,
    createdAt: now,
    updatedAt: now,
    storyId,
  })

  return { id, title: input.title, content: input.content, createdAt: now, updatedAt: now }
}

export function updateNote(id: string, storyId: string, input: NoteInput): Note | null {
  const db = getDb()
  const existing = getNoteById(id, storyId)
  if (!existing) return null

  const updatedAt = Date.now()

  db.prepare(
    'UPDATE notes SET title = @title, content = @content, updated_at = @updatedAt WHERE id = @id AND story_id = @storyId',
  ).run({
    id,
    storyId,
    title: input.title,
    content: input.content,
    updatedAt,
  })

  return { ...existing, title: input.title, content: input.content, updatedAt }
}

export function deleteNote(id: string, storyId: string): void {
  const db = getDb()
  db.prepare('DELETE FROM notes WHERE id = ? AND story_id = ?').run(id, storyId)
}
