import { describe, it, expect, vi } from 'vitest'
import { fetchVerbatimWindowWords, updateVerbatimWindowWords } from './verbatimWindowApi'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

describe('fetchVerbatimWindowWords', () => {
  it('returns the verbatim window words from a successful response', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ verbatimWindowWords: 2500 }),
    } as Response)

    const result = await fetchVerbatimWindowWords()

    expect(result).toBe(2500)
    expect(mockedFetch).toHaveBeenCalledWith('/api/verbatim-window')
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(fetchVerbatimWindowWords()).rejects.toThrow()
  })
})

describe('updateVerbatimWindowWords', () => {
  it('sends a PUT request and returns the saved value', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ verbatimWindowWords: 1800 }),
    } as Response)

    const result = await updateVerbatimWindowWords(1800)

    expect(result).toBe(1800)
    expect(mockedFetch).toHaveBeenCalledWith('/api/verbatim-window', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verbatimWindowWords: 1800 }),
    })
  })

  it('throws with the server-provided error message when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'verbatimWindowWords must be a positive integer' }),
    } as Response)

    await expect(updateVerbatimWindowWords(0)).rejects.toThrow(
      'verbatimWindowWords must be a positive integer',
    )
  })
})
