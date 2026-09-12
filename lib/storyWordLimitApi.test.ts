import { describe, it, expect, vi } from 'vitest'
import { fetchMaxStoryWords, updateMaxStoryWords } from './storyWordLimitApi'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

describe('fetchMaxStoryWords', () => {
  it('returns the max story words from a successful response', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ maxStoryWords: 100 }),
    } as Response)

    const result = await fetchMaxStoryWords()

    expect(result).toBe(100)
    expect(mockedFetch).toHaveBeenCalledWith('/api/story-word-limit')
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(fetchMaxStoryWords()).rejects.toThrow()
  })
})

describe('updateMaxStoryWords', () => {
  it('sends a PUT request and returns the saved value', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ maxStoryWords: 250 }),
    } as Response)

    const result = await updateMaxStoryWords(250)

    expect(result).toBe(250)
    expect(mockedFetch).toHaveBeenCalledWith('/api/story-word-limit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxStoryWords: 250 }),
    })
  })

  it('throws with the server-provided error message when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'maxStoryWords must be a positive integer' }),
    } as Response)

    await expect(updateMaxStoryWords(0)).rejects.toThrow('maxStoryWords must be a positive integer')
  })
})
