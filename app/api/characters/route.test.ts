import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/charactersRepository', () => ({
  getAllCharacters: vi.fn(),
  createCharacter: vi.fn(),
}))

import { GET, POST } from './route'
import { getAllCharacters, createCharacter } from '@/lib/charactersRepository'

const mockedGetAllCharacters = vi.mocked(getAllCharacters)
const mockedCreateCharacter = vi.mocked(createCharacter)

function makeRequest(body?: unknown, storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null
      ? 'http://localhost/api/characters'
      : `http://localhost/api/characters?storyId=${storyId}`
  return new Request(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/characters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the characters from the repository', async () => {
    const characters = [
      { id: '1', name: 'Alice', description: 'Une héroïne', createdAt: 1000, updatedAt: 1000 },
    ]
    mockedGetAllCharacters.mockReturnValue(characters)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ characters })
    expect(mockedGetAllCharacters).toHaveBeenCalledWith('test-story')
  })



  it('returns 400 when storyId is missing', async () => {
    const response = await GET(makeRequest(undefined, null))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedGetAllCharacters).not.toHaveBeenCalled()
  })
})

describe('POST /api/characters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a character and returns 201', async () => {
    const character = { id: '1', name: 'Alice', description: 'Une héroïne', createdAt: 1000, updatedAt: 1000 }
    mockedCreateCharacter.mockReturnValue(character)

    const response = await POST(makeRequest({ name: 'Alice', description: 'Une héroïne' }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual({ character })
    expect(mockedCreateCharacter).toHaveBeenCalledWith(
      { name: 'Alice', description: 'Une héroïne' },
      'test-story',
          )
  })

  it('trims whitespace before creating', async () => {
    const character = { id: '1', name: 'Alice', description: 'Une héroïne', createdAt: 1000, updatedAt: 1000 }
    mockedCreateCharacter.mockReturnValue(character)

    await POST(makeRequest({ name: '  Alice  ', description: '  Une héroïne  ' }))

    expect(mockedCreateCharacter).toHaveBeenCalledWith(
      { name: 'Alice', description: 'Une héroïne' },
      'test-story',
          )
  })

  it('returns 400 when name is missing', async () => {
    const response = await POST(makeRequest({ description: 'Une héroïne' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedCreateCharacter).not.toHaveBeenCalled()
  })

  it('creates a character with an empty description when none is given', async () => {
    const character = { id: '1', name: 'Alice', description: '', createdAt: 1000, updatedAt: 1000 }
    mockedCreateCharacter.mockReturnValue(character)

    const response = await POST(makeRequest({ name: 'Alice' }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual({ character })
    expect(mockedCreateCharacter).toHaveBeenCalledWith({ name: 'Alice', description: '' }, 'test-story')
  })

  it('creates a character with an empty description when it is blank', async () => {
    const character = { id: '1', name: 'Alice', description: '', createdAt: 1000, updatedAt: 1000 }
    mockedCreateCharacter.mockReturnValue(character)

    await POST(makeRequest({ name: 'Alice', description: '   ' }))

    expect(mockedCreateCharacter).toHaveBeenCalledWith({ name: 'Alice', description: '' }, 'test-story')
  })


  it('returns 400 when storyId is missing', async () => {
    const response = await POST(makeRequest({ name: 'Alice', description: 'Une héroïne' }, null))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedCreateCharacter).not.toHaveBeenCalled()
  })
})
