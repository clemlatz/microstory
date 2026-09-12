import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('db', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates the messages table', async () => {
    const { getDb } = await import('./db')
    const db = getDb()

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'")
      .all()

    expect(tables).toHaveLength(1)
  })

  it('creates the characters table', async () => {
    const { getDb } = await import('./db')
    const db = getDb()

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='characters'")
      .all()

    expect(tables).toHaveLength(1)
  })

  it('creates the settings table', async () => {
    const { getDb } = await import('./db')
    const db = getDb()

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
      .all()

    expect(tables).toHaveLength(1)
  })

  it('creates the auth_sessions table', async () => {
    const { getDb } = await import('./db')
    const db = getDb()

    const columns = db.prepare('PRAGMA table_info(auth_sessions)').all() as { name: string }[]
    expect(columns.map((c) => c.name)).toEqual(expect.arrayContaining(['token_hash', 'created_at']))
  })

  it('returns the same connection on repeated calls', async () => {
    const { getDb } = await import('./db')
    expect(getDb()).toBe(getDb())
  })
})

describe('getDb', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_PATH', ':memory:')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates the stories table and story_id columns on existing tables', async () => {
    const { getDb } = await import('./db')
    const db = getDb()

    const storiesColumns = db.prepare("PRAGMA table_info(stories)").all() as { name: string }[]
    expect(storiesColumns.map((c) => c.name)).toEqual(
      expect.arrayContaining(['id', 'title', 'created_at', 'updated_at']),
    )

    for (const table of ['messages', 'characters', 'conversation_summaries']) {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
      expect(columns.map((c) => c.name)).toContain('story_id')
    }
  })

  it('is idempotent — calling getDb twice does not throw on the ALTER TABLE', async () => {
    const { getDb } = await import('./db')
    expect(() => {
      getDb()
      getDb()
    }).not.toThrow()
  })
})
