import { describe, it, expect, vi } from 'vitest'
import { fetchAutoSummaryThresholdWords, updateAutoSummaryThresholdWords } from './autoSummaryThresholdApi'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

describe('fetchAutoSummaryThresholdWords', () => {
  it('returns the auto-summary threshold words from a successful response', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ autoSummaryThresholdWords: 5000 }),
    } as Response)

    const result = await fetchAutoSummaryThresholdWords()

    expect(result).toBe(5000)
    expect(mockedFetch).toHaveBeenCalledWith('/api/auto-summary-threshold')
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(fetchAutoSummaryThresholdWords()).rejects.toThrow()
  })
})

describe('updateAutoSummaryThresholdWords', () => {
  it('sends a PUT request and returns the saved value', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ autoSummaryThresholdWords: 3000 }),
    } as Response)

    const result = await updateAutoSummaryThresholdWords(3000)

    expect(result).toBe(3000)
    expect(mockedFetch).toHaveBeenCalledWith('/api/auto-summary-threshold', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoSummaryThresholdWords: 3000 }),
    })
  })

  it('throws with the server-provided error message when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'autoSummaryThresholdWords must be a positive integer' }),
    } as Response)

    await expect(updateAutoSummaryThresholdWords(0)).rejects.toThrow(
      'autoSummaryThresholdWords must be a positive integer',
    )
  })
})
