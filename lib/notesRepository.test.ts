import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const storyId = 'story-1'

describe('notesRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns an empty array when no notes exist', async () => {
    const { getAllNotes } = await import('./notesRepository')
    expect(getAllNotes(storyId)).toEqual([])
  })

  it('createNote stores a new note with generated id and timestamps', async () => {
    const { createNote, getAllNotes } = await import('./notesRepository')

    const note = createNote({ title: 'Règle du monde', content: 'La magie coûte cher' }, storyId)

    expect(note.id).toBeTypeOf('string')
    expect(note.title).toBe('Règle du monde')
    expect(note.content).toBe('La magie coûte cher')
    expect(note.createdAt).toBeTypeOf('number')
    expect(note.updatedAt).toBe(note.createdAt)
    expect(getAllNotes(storyId)).toEqual([note])
  })

  it('getAllNotes orders results by createdAt ascending', async () => {
    const { createNote, getAllNotes } = await import('./notesRepository')
    const first = createNote({ title: 'Première', content: 'Contenu 1' }, storyId)
    const second = createNote({ title: 'Deuxième', content: 'Contenu 2' }, storyId)

    expect(getAllNotes(storyId)).toEqual([first, second])
  })

  it('getNoteById returns the matching note or null', async () => {
    const { createNote, getNoteById } = await import('./notesRepository')
    const note = createNote({ title: 'Idée', content: 'Une idée' }, storyId)

    expect(getNoteById(note.id, storyId)).toEqual(note)
    expect(getNoteById('missing-id', storyId)).toBeNull()
  })

  it('updateNote modifies title and content and bumps updatedAt', async () => {
    const { createNote, updateNote, getNoteById } = await import('./notesRepository')
    const note = createNote({ title: 'Idée', content: 'Une idée' }, storyId)

    const updated = updateNote(note.id, storyId, {
      title: 'Idée révisée',
      content: 'Une idée plus précise',
    })

    expect(updated).not.toBeNull()
    expect(updated?.title).toBe('Idée révisée')
    expect(updated?.content).toBe('Une idée plus précise')
    expect(updated?.createdAt).toBe(note.createdAt)
    expect(getNoteById(note.id, storyId)).toEqual(updated)
  })

  it('updateNote returns null when the note does not exist', async () => {
    const { updateNote } = await import('./notesRepository')
    expect(updateNote('missing-id', storyId, { title: 'X', content: 'Y' })).toBeNull()
  })

  it('updateNote backs up the previous title/content into note_versions', async () => {
    const { createNote, updateNote } = await import('./notesRepository')
    const { getDb } = await import('./db')
    const { VERSION_GROUPING_WINDOW_MS } = await import('./versionGroupingWindow')
    vi.useFakeTimers()
    try {
      vi.setSystemTime(0)
      const note = createNote({ title: 'Idée', content: 'Une idée' }, storyId)

      vi.setSystemTime(VERSION_GROUPING_WINDOW_MS + 1)
      updateNote(note.id, storyId, { title: 'Idée révisée', content: 'Une idée plus précise' })

      vi.setSystemTime(2 * (VERSION_GROUPING_WINDOW_MS + 1))
      updateNote(note.id, storyId, { title: 'Idée finale', content: 'Encore autre chose' })

      const versions = getDb()
        .prepare(
          'SELECT note_id, story_id, title, content FROM note_versions WHERE note_id = ? ORDER BY created_at ASC',
        )
        .all(note.id)

      expect(versions).toEqual([
        { note_id: note.id, story_id: storyId, title: 'Idée', content: 'Une idée' },
        {
          note_id: note.id,
          story_id: storyId,
          title: 'Idée révisée',
          content: 'Une idée plus précise',
        },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('updateNote does not create a new version when edits happen within the grouping window', async () => {
    const { createNote, updateNote } = await import('./notesRepository')
    const { getDb } = await import('./db')
    vi.useFakeTimers()
    try {
      vi.setSystemTime(0)
      const note = createNote({ title: 'Idée', content: 'Une idée' }, storyId)

      vi.setSystemTime(1000)
      updateNote(note.id, storyId, { title: 'Idée r', content: 'Une idée p' })
      vi.setSystemTime(2000)
      updateNote(note.id, storyId, { title: 'Idée ré', content: 'Une idée pl' })
      vi.setSystemTime(3000)
      updateNote(note.id, storyId, { title: 'Idée révisée', content: 'Une idée plus précise' })

      const versions = getDb()
        .prepare('SELECT title FROM note_versions WHERE note_id = ? ORDER BY created_at ASC')
        .all(note.id)

      expect(versions).toEqual([{ title: 'Idée' }])
    } finally {
      vi.useRealTimers()
    }
  })

  it('deleteNote removes the note', async () => {
    const { createNote, deleteNote, getAllNotes } = await import('./notesRepository')
    const note = createNote({ title: 'Idée', content: 'Une idée' }, storyId)
    deleteNote(note.id, storyId)
    expect(getAllNotes(storyId)).toEqual([])
  })

  it('deleteNote also removes its versions', async () => {
    const { createNote, updateNote, deleteNote } = await import('./notesRepository')
    const { getDb } = await import('./db')
    const note = createNote({ title: 'Idée', content: 'Une idée' }, storyId)
    updateNote(note.id, storyId, { title: 'Idée révisée', content: 'Autre' })

    deleteNote(note.id, storyId)

    const versions = getDb().prepare('SELECT * FROM note_versions WHERE note_id = ?').all(note.id)
    expect(versions).toEqual([])
  })

  it('deleteNote on a missing id does not throw', async () => {
    const { deleteNote } = await import('./notesRepository')
    expect(() => deleteNote('missing-id', storyId)).not.toThrow()
  })

  it("scopes notes by storyId, not returning another story's notes", async () => {
    const { createNote, getAllNotes } = await import('./notesRepository')
    const note = createNote({ title: 'Idée', content: 'Une idée' }, storyId)
    const otherNote = createNote({ title: 'Autre idée', content: 'Autre histoire' }, 'story-2')

    expect(getAllNotes(storyId)).toEqual([note])
    expect(getAllNotes('story-2')).toEqual([otherNote])
  })

  describe('searchNotes', () => {
    it('matches by title, case-insensitively', async () => {
      const { createNote, searchNotes } = await import('./notesRepository')
      const note = createNote({ title: 'Règle du monde', content: 'La magie coûte cher' }, storyId)
      createNote({ title: 'Autre idée', content: 'Contenu sans rapport' }, storyId)

      expect(searchNotes('règle', storyId)).toEqual([note])
      expect(searchNotes('RÈGLE', storyId)).toEqual([note])
    })

    it('matches by content', async () => {
      const { createNote, searchNotes } = await import('./notesRepository')
      const note = createNote({ title: 'Règle du monde', content: 'La magie coûte cher' }, storyId)

      expect(searchNotes('magie', storyId)).toEqual([note])
    })

    it('returns an empty array for an empty query', async () => {
      const { createNote, searchNotes } = await import('./notesRepository')
      createNote({ title: 'Règle du monde', content: 'La magie coûte cher' }, storyId)

      expect(searchNotes('', storyId)).toEqual([])
      expect(searchNotes('   ', storyId)).toEqual([])
    })

    it('returns an empty array when nothing matches', async () => {
      const { createNote, searchNotes } = await import('./notesRepository')
      createNote({ title: 'Règle du monde', content: 'La magie coûte cher' }, storyId)

      expect(searchNotes('dragon', storyId)).toEqual([])
    })

    it("does not match another story's notes", async () => {
      const { createNote, searchNotes } = await import('./notesRepository')
      createNote({ title: 'Règle du monde', content: 'La magie coûte cher' }, 'story-2')

      expect(searchNotes('règle', storyId)).toEqual([])
    })
  })
})
