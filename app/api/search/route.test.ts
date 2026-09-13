import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/searchRepository', () => ({
  searchKnowledgeBase: vi.fn(),
}))

import { GET } from './route'
import { searchKnowledgeBase } from '@/lib/searchRepository'
import { storyExists } from '@/lib/storiesRepository'

const mockedSearch = vi.mocked(searchKnowledgeBase)
const mockedStoryExists = vi.mocked(storyExists)

function makeRequest(storyId: string | null, q: string | null): Request {
  const params = new URLSearchParams()
  if (storyId !== null) params.set('storyId', storyId)
  if (q !== null) params.set('q', q)
  return new Request(`http://localhost/api/search?${params.toString()}`)
}

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedStoryExists.mockReturnValue(true)
  })

  it('returns the results from searchKnowledgeBase', async () => {
    const results = [{ type: 'character' as const, id: 'c1', title: 'Alice', snippet: 'Une héroïne' }]
    mockedSearch.mockReturnValue(results)

    const response = await GET(makeRequest('test-story', 'alice'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ results })
    expect(mockedSearch).toHaveBeenCalledWith('alice', 'test-story')
  })

  it('returns an empty array without calling the repository when q is missing', async () => {
    const response = await GET(makeRequest('test-story', null))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ results: [] })
    expect(mockedSearch).not.toHaveBeenCalled()
  })

  it('returns an empty array without calling the repository when q is blank', async () => {
    const response = await GET(makeRequest('test-story', '   '))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ results: [] })
    expect(mockedSearch).not.toHaveBeenCalled()
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await GET(makeRequest(null, 'alice'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedSearch).not.toHaveBeenCalled()
  })

  it('returns 404 when the story does not exist', async () => {
    mockedStoryExists.mockReturnValue(false)

    const response = await GET(makeRequest('missing-story', 'alice'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'story not found' })
    expect(mockedSearch).not.toHaveBeenCalled()
  })
})
