import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/charactersRepository', () => ({
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
}))

import { PUT, DELETE } from './route'
import { updateCharacter, deleteCharacter } from '@/lib/charactersRepository'

const mockedUpdateCharacter = vi.mocked(updateCharacter)
const mockedDeleteCharacter = vi.mocked(deleteCharacter)

function makeRequest(body: unknown, storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null
      ? 'http://localhost/api/characters/1'
      : `http://localhost/api/characters/1?storyId=${storyId}`
  return new Request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null
      ? 'http://localhost/api/characters/1'
      : `http://localhost/api/characters/1?storyId=${storyId}`
  return new Request(url)
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PUT /api/characters/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates the character and returns it', async () => {
    const character = { id: '1', name: 'Alice Doe', description: 'Mise à jour', createdAt: 1000, updatedAt: 2000 }
    mockedUpdateCharacter.mockReturnValue(character)

    const response = await PUT(makeRequest({ name: 'Alice Doe', description: 'Mise à jour' }), context('1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ character })
    expect(mockedUpdateCharacter).toHaveBeenCalledWith(
      '1',
      'test-story',
      { name: 'Alice Doe', description: 'Mise à jour' },
          )
  })

  it('returns 404 when the character does not exist', async () => {
    mockedUpdateCharacter.mockReturnValue(null)

    const response = await PUT(makeRequest({ name: 'Alice', description: 'X' }), context('missing'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBeTypeOf('string')
  })

  it('returns 400 when name is missing', async () => {
    const response = await PUT(makeRequest({ description: 'X' }), context('1'))

    expect(response.status).toBe(400)
    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })



  it('returns 400 when storyId is missing', async () => {
    const response = await PUT(makeRequest({ name: 'Alice', description: 'X' }, null), context('1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/characters/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the character and returns success', async () => {
    const response = await DELETE(makeDeleteRequest(), context('1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
    expect(mockedDeleteCharacter).toHaveBeenCalledWith('1', 'test-story')
  })


  it('returns 400 when storyId is missing', async () => {
    const response = await DELETE(makeDeleteRequest(null), context('1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedDeleteCharacter).not.toHaveBeenCalled()
  })
})
