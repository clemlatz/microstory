import { describe, it, expect, vi } from 'vitest'
import { fetchCharacters, createCharacter, updateCharacter, deleteCharacter } from './charactersApi'
import type { Character } from './types'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

const character: Character = {
  id: '1',
  name: 'Alice',
  description: 'Une héroïne curieuse',
  createdAt: 1000,
  updatedAt: 1000,
}

describe('fetchCharacters', () => {
  it('returns the characters from a successful response', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ characters: [character] }),
    } as Response)

    const result = await fetchCharacters('story-1')

    expect(result).toEqual([character])
    expect(mockedFetch).toHaveBeenCalledWith('/api/characters?storyId=story-1')
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(fetchCharacters('story-1')).rejects.toThrow()
  })
})

describe('createCharacter', () => {
  it('posts the input and returns the created character', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ character }),
    } as Response)

    const result = await createCharacter('story-1', {
      name: 'Alice',
      description: 'Une héroïne curieuse',
    })

    expect(result).toEqual(character)
    expect(mockedFetch).toHaveBeenCalledWith('/api/characters?storyId=story-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', description: 'Une héroïne curieuse' }),
    })
  })

  it('throws with the server-provided error message when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'name and description are required' }),
    } as Response)

    await expect(createCharacter('story-1', { name: '', description: '' })).rejects.toThrow(
      'name and description are required',
    )
  })
})

describe('updateCharacter', () => {
  it('sends a PUT request and returns the updated character', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ character }),
    } as Response)

    const result = await updateCharacter('story-1', '1', {
      name: 'Alice',
      description: 'Mise à jour',
    })

    expect(result).toEqual(character)
    expect(mockedFetch).toHaveBeenCalledWith('/api/characters/1?storyId=story-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', description: 'Mise à jour' }),
    })
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'character not found' }),
    } as Response)

    await expect(
      updateCharacter('story-1', 'missing', { name: 'A', description: 'B' }),
    ).rejects.toThrow('character not found')
  })
})

describe('deleteCharacter', () => {
  it('sends a DELETE request to /api/characters/:id', async () => {
    mockedFetch.mockResolvedValue({ ok: true } as Response)

    await deleteCharacter('story-1', '1')

    expect(mockedFetch).toHaveBeenCalledWith('/api/characters/1?storyId=story-1', {
      method: 'DELETE',
    })
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(deleteCharacter('story-1', '1')).rejects.toThrow()
  })
})
