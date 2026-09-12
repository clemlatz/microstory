import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

let db: Database.Database | null = null

export function resolveDbPath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'chat.db')
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, type: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (columns.some((c) => c.name === column)) return
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
}

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = resolveDbPath()

  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  }

  db = new Database(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_summaries (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      cutoff_message_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      type TEXT NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
  // Passkey (WebAuthn) login sessions — see lib/authRepository.ts. Only the
  // hash of the session token is stored, never the token itself, so a leaked
  // database row can't be replayed as a session cookie.
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      story_id TEXT
    )
  `)

  // Snapshots of a character's/note's fields as they were right before an
  // edit overwrote them (lib/charactersRepository.ts's updateCharacter,
  // lib/notesRepository.ts's updateNote) — a pure backup, not yet exposed
  // through any UI or API.
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_versions (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      story_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS note_versions (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      story_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  addColumnIfMissing(db, 'messages', 'story_id', 'TEXT')
  addColumnIfMissing(db, 'characters', 'story_id', 'TEXT')
  addColumnIfMissing(db, 'conversation_summaries', 'story_id', 'TEXT')

  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_story_id ON messages(story_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_characters_story_id ON characters(story_id)')
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_conversation_summaries_story_id ON conversation_summaries(story_id)',
  )
  db.exec('CREATE INDEX IF NOT EXISTS idx_notes_story_id ON notes(story_id)')
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_character_versions_character_id ON character_versions(character_id)',
  )
  db.exec('CREATE INDEX IF NOT EXISTS idx_character_versions_story_id ON character_versions(story_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_note_versions_note_id ON note_versions(note_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_note_versions_story_id ON note_versions(story_id)')

  return db
}
