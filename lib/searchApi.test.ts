import { describe, it, expect, vi } from 'vitest'
import { searchKnowledgeBase } from './searchApi'
import type { SearchResult } from './types'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

const result: SearchResult = { type: 'character', id: '1', title: 'Alice', snippet: 'Une héroïne' }

describe('searchKnowledgeBase', () => {
  it('returns the results from a successful response', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [result] }),
    } as Response)

    const results = await searchKnowledgeBase('story-1', 'alice')

    expect(results).toEqual([result])
    expect(mockedFetch).toHaveBeenCalledWith('/api/search?storyId=story-1&q=alice')
  })

  it('URL-encodes the query and storyId', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    } as Response)

    await searchKnowledgeBase('story 1', 'a b')

    expect(mockedFetch).toHaveBeenCalledWith('/api/search?storyId=story%201&q=a%20b')
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(searchKnowledgeBase('story-1', 'alice')).rejects.toThrow()
  })
})
