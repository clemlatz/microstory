import { describe, it, expect, vi } from 'vitest'
import { fetchContextUsage } from './contextUsageApi'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

describe('fetchContextUsage', () => {
  it('returns the used and max token counts and model status from a successful response', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          usedTokens: 14320,
          maxTokens: 32768,
          pendingWords: 1200,
          autoSummaryThresholdWords: 5000,
          modelName: 'local-model',
          modelLoaded: true,
          modelIsLoading: false,
        }),
    } as Response)

    const result = await fetchContextUsage('story-1')

    expect(result).toEqual({
      usedTokens: 14320,
      maxTokens: 32768,
      pendingWords: 1200,
      autoSummaryThresholdWords: 5000,
      modelName: 'local-model',
      modelLoaded: true,
      modelIsLoading: false,
    })
    expect(mockedFetch).toHaveBeenCalledWith('/api/context-usage?storyId=story-1')
  })

  it('throws with the server-provided error message when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: 'connect ECONNREFUSED' }),
    } as Response)

    await expect(fetchContextUsage('story-1')).rejects.toThrow('connect ECONNREFUSED')
  })

  it('throws a generic error when the response is not ok and not valid JSON', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(fetchContextUsage('story-1')).rejects.toThrow()
  })
})
