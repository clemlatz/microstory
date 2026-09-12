import { describe, it, expect, vi } from 'vitest'
import { fetchNotes, createNote, updateNote, deleteNote } from './notesApi'
import type { Note } from './types'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

const note: Note = {
  id: '1',
  title: 'Idée',
  content: 'Une idée sans catégorie',
  createdAt: 1000,
  updatedAt: 1000,
}

describe('fetchNotes', () => {
  it('returns the notes from a successful response', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ notes: [note] }),
    } as Response)

    const result = await fetchNotes('story-1')

    expect(result).toEqual([note])
    expect(mockedFetch).toHaveBeenCalledWith('/api/notes?storyId=story-1')
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(fetchNotes('story-1')).rejects.toThrow()
  })
})

describe('createNote', () => {
  it('posts the input and returns the created note', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ note }),
    } as Response)

    const result = await createNote('story-1', { title: 'Idée', content: 'Une idée sans catégorie' })

    expect(result).toEqual(note)
    expect(mockedFetch).toHaveBeenCalledWith('/api/notes?storyId=story-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Idée', content: 'Une idée sans catégorie' }),
    })
  })

  it('throws with the server-provided error message when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'title and content are required' }),
    } as Response)

    await expect(createNote('story-1', { title: '', content: '' })).rejects.toThrow(
      'title and content are required',
    )
  })
})

describe('updateNote', () => {
  it('sends a PUT request and returns the updated note', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ note }),
    } as Response)

    const result = await updateNote('story-1', '1', { title: 'Idée', content: 'Mise à jour' })

    expect(result).toEqual(note)
    expect(mockedFetch).toHaveBeenCalledWith('/api/notes/1?storyId=story-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Idée', content: 'Mise à jour' }),
    })
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'note not found' }),
    } as Response)

    await expect(updateNote('story-1', 'missing', { title: 'A', content: 'B' })).rejects.toThrow(
      'note not found',
    )
  })
})

describe('deleteNote', () => {
  it('sends a DELETE request to /api/notes/:id', async () => {
    mockedFetch.mockResolvedValue({ ok: true } as Response)

    await deleteNote('story-1', '1')

    expect(mockedFetch).toHaveBeenCalledWith('/api/notes/1?storyId=story-1', {
      method: 'DELETE',
    })
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(deleteNote('story-1', '1')).rejects.toThrow()
  })
})
