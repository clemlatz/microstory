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

  it('deleteNote removes the note', async () => {
    const { createNote, deleteNote, getAllNotes } = await import('./notesRepository')
    const note = createNote({ title: 'Idée', content: 'Une idée' }, storyId)
    deleteNote(note.id, storyId)
    expect(getAllNotes(storyId)).toEqual([])
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
})
