import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/settingsRepository', () => ({
  getMaxStoryWords: vi.fn(),
  setMaxStoryWords: vi.fn(),
}))

import { GET, PUT } from './route'
import { getMaxStoryWords, setMaxStoryWords } from '@/lib/settingsRepository'

const mockedGetMaxStoryWords = vi.mocked(getMaxStoryWords)
const mockedSetMaxStoryWords = vi.mocked(setMaxStoryWords)

function makeRequest(body?: unknown): Request {
  return new Request('http://localhost/api/story-word-limit', {
    method: body ? 'PUT' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/story-word-limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the max story words from the repository', async () => {
    mockedGetMaxStoryWords.mockReturnValue(100)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ maxStoryWords: 100 })
  })

})

describe('PUT /api/story-word-limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves the max story words and returns it', async () => {
    mockedGetMaxStoryWords.mockReturnValue(250)

    const response = await PUT(makeRequest({ maxStoryWords: 250 }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ maxStoryWords: 250 })
    expect(mockedSetMaxStoryWords).toHaveBeenCalledWith(250)
  })

  it('returns 400 when maxStoryWords is not a number', async () => {
    const response = await PUT(makeRequest({ maxStoryWords: 'lots' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedSetMaxStoryWords).not.toHaveBeenCalled()
  })

  it('returns 400 when maxStoryWords is zero or negative', async () => {
    const response = await PUT(makeRequest({ maxStoryWords: 0 }))

    expect(response.status).toBe(400)
    expect(mockedSetMaxStoryWords).not.toHaveBeenCalled()
  })

  it('returns 400 when maxStoryWords is not an integer', async () => {
    const response = await PUT(makeRequest({ maxStoryWords: 12.5 }))

    expect(response.status).toBe(400)
    expect(mockedSetMaxStoryWords).not.toHaveBeenCalled()
  })

  it('returns 400 when maxStoryWords is missing', async () => {
    const response = await PUT(makeRequest({}))

    expect(response.status).toBe(400)
    expect(mockedSetMaxStoryWords).not.toHaveBeenCalled()
  })

})
