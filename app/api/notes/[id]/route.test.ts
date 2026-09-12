import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/notesRepository', () => ({
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}))

import { PUT, DELETE } from './route'
import { updateNote, deleteNote } from '@/lib/notesRepository'

const mockedUpdateNote = vi.mocked(updateNote)
const mockedDeleteNote = vi.mocked(deleteNote)

function makeRequest(body: unknown, storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null ? 'http://localhost/api/notes/1' : `http://localhost/api/notes/1?storyId=${storyId}`
  return new Request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null ? 'http://localhost/api/notes/1' : `http://localhost/api/notes/1?storyId=${storyId}`
  return new Request(url)
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PUT /api/notes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates the note and returns it', async () => {
    const note = { id: '1', title: 'Idée révisée', content: 'Mise à jour', createdAt: 1000, updatedAt: 2000 }
    mockedUpdateNote.mockReturnValue(note)

    const response = await PUT(makeRequest({ title: 'Idée révisée', content: 'Mise à jour' }), context('1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ note })
    expect(mockedUpdateNote).toHaveBeenCalledWith('1', 'test-story', {
      title: 'Idée révisée',
      content: 'Mise à jour',
    })
  })

  it('returns 404 when the note does not exist', async () => {
    mockedUpdateNote.mockReturnValue(null)

    const response = await PUT(makeRequest({ title: 'Idée', content: 'X' }), context('missing'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBeTypeOf('string')
  })

  it('returns 400 when title is missing', async () => {
    const response = await PUT(makeRequest({ content: 'X' }), context('1'))

    expect(response.status).toBe(400)
    expect(mockedUpdateNote).not.toHaveBeenCalled()
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await PUT(makeRequest({ title: 'Idée', content: 'X' }, null), context('1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedUpdateNote).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/notes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the note and returns success', async () => {
    const response = await DELETE(makeDeleteRequest(), context('1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
    expect(mockedDeleteNote).toHaveBeenCalledWith('1', 'test-story')
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await DELETE(makeDeleteRequest(null), context('1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedDeleteNote).not.toHaveBeenCalled()
  })
})
