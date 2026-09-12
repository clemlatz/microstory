import { randomUUID } from 'node:crypto'
import { getDb } from './db'
import type { Character } from './types'

type CharacterRow = {
  id: string
  name: string
  description: string
  created_at: number
  updated_at: number
}

function toCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type CharacterInput = {
  name: string
  description: string
}

export function getAllCharacters(storyId: string): Character[] {
  const db = getDb()
  const rows = db
    .prepare(
      'SELECT id, name, description, created_at, updated_at FROM characters WHERE story_id = ? ORDER BY created_at ASC',
    )
    .all(storyId) as CharacterRow[]
  return rows.map(toCharacter)
}

export function getCharacterById(id: string, storyId: string): Character | null {
  const db = getDb()
  const row = db
    .prepare(
      'SELECT id, name, description, created_at, updated_at FROM characters WHERE id = ? AND story_id = ?',
    )
    .get(id, storyId) as CharacterRow | undefined
  return row ? toCharacter(row) : null
}

export function createCharacter(input: CharacterInput, storyId: string): Character {
  const db = getDb()
  const now = Date.now()
  const id = randomUUID()

  db.prepare(
    `INSERT INTO characters (id, name, description, created_at, updated_at, story_id)
     VALUES (@id, @name, @description, @createdAt, @updatedAt, @storyId)`,
  ).run({
    id,
    name: input.name,
    description: input.description,
    createdAt: now,
    updatedAt: now,
    storyId,
  })

  return { id, name: input.name, description: input.description, createdAt: now, updatedAt: now }
}

export function updateCharacter(id: string, storyId: string, input: CharacterInput): Character | null {
  const db = getDb()
  const existing = getCharacterById(id, storyId)
  if (!existing) return null

  const updatedAt = Date.now()

  db.prepare(
    'UPDATE characters SET name = @name, description = @description, updated_at = @updatedAt WHERE id = @id AND story_id = @storyId',
  ).run({
    id,
    storyId,
    name: input.name,
    description: input.description,
    updatedAt,
  })

  return { ...existing, name: input.name, description: input.description, updatedAt }
}

export function deleteCharacter(id: string, storyId: string): void {
  const db = getDb()
  db.prepare('DELETE FROM characters WHERE id = ? AND story_id = ?').run(id, storyId)
}

/**
 * Serializes the current character list into a system-prompt message so the LLM knows
 * who the story's characters are. Returns null when there are no characters, so callers
 * can skip adding an empty/pointless system message.
 *
 * Rebuilt from the table on every call rather than injected once into the conversation
 * history: this keeps it in sync with edits/deletions made in the config panel, and keeps
 * it independent from "Réinitialiser la conversation" (which clears message history but
 * must not make characters disappear from generation).
 */
export function buildCharactersSystemMessage(characters: Character[]): string | null {
  if (characters.length === 0) return null

  const sheets = characters
    .map((character) => `- Name: ${character.name}\n  Description: ${character.description}`)
    .join('\n')

  return `Here is the list of characters in the story currently being written. Use this information to stay consistent with them:\n\n${sheets}`
}
