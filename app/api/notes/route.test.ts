import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/notesRepository', () => ({
  getAllNotes: vi.fn(),
  createNote: vi.fn(),
}))

import { GET, POST } from './route'
import { getAllNotes, createNote } from '@/lib/notesRepository'

const mockedGetAllNotes = vi.mocked(getAllNotes)
const mockedCreateNote = vi.mocked(createNote)

function makeRequest(body?: unknown, storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null ? 'http://localhost/api/notes' : `http://localhost/api/notes?storyId=${storyId}`
  return new Request(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the notes from the repository', async () => {
    const notes = [{ id: '1', title: 'Idée', content: 'Une idée', createdAt: 1000, updatedAt: 1000 }]
    mockedGetAllNotes.mockReturnValue(notes)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ notes })
    expect(mockedGetAllNotes).toHaveBeenCalledWith('test-story')
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await GET(makeRequest(undefined, null))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedGetAllNotes).not.toHaveBeenCalled()
  })
})

describe('POST /api/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a note and returns 201', async () => {
    const note = { id: '1', title: 'Idée', content: 'Une idée', createdAt: 1000, updatedAt: 1000 }
    mockedCreateNote.mockReturnValue(note)

    const response = await POST(makeRequest({ title: 'Idée', content: 'Une idée' }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual({ note })
    expect(mockedCreateNote).toHaveBeenCalledWith({ title: 'Idée', content: 'Une idée' }, 'test-story')
  })

  it('trims whitespace before creating', async () => {
    const note = { id: '1', title: 'Idée', content: 'Une idée', createdAt: 1000, updatedAt: 1000 }
    mockedCreateNote.mockReturnValue(note)

    await POST(makeRequest({ title: '  Idée  ', content: '  Une idée  ' }))

    expect(mockedCreateNote).toHaveBeenCalledWith({ title: 'Idée', content: 'Une idée' }, 'test-story')
  })

  it('returns 400 when title is missing', async () => {
    const response = await POST(makeRequest({ content: 'Une idée' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedCreateNote).not.toHaveBeenCalled()
  })

  it('returns 400 when content is empty', async () => {
    const response = await POST(makeRequest({ title: 'Idée', content: '   ' }))

    expect(response.status).toBe(400)
    expect(mockedCreateNote).not.toHaveBeenCalled()
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await POST(makeRequest({ title: 'Idée', content: 'Une idée' }, null))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedCreateNote).not.toHaveBeenCalled()
  })
})
