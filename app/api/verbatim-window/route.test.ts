import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/settingsRepository', () => ({
  getVerbatimWindowWords: vi.fn(),
  setVerbatimWindowWords: vi.fn(),
}))

import { GET, PUT } from './route'
import { getVerbatimWindowWords, setVerbatimWindowWords } from '@/lib/settingsRepository'

const mockedGetVerbatimWindowWords = vi.mocked(getVerbatimWindowWords)
const mockedSetVerbatimWindowWords = vi.mocked(setVerbatimWindowWords)

function makeRequest(body?: unknown): Request {
  return new Request('http://localhost/api/verbatim-window', {
    method: body ? 'PUT' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/verbatim-window', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the verbatim window words from the repository', async () => {
    mockedGetVerbatimWindowWords.mockReturnValue(2500)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ verbatimWindowWords: 2500 })
  })

})

describe('PUT /api/verbatim-window', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves the verbatim window words and returns it', async () => {
    mockedGetVerbatimWindowWords.mockReturnValue(1800)

    const response = await PUT(makeRequest({ verbatimWindowWords: 1800 }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ verbatimWindowWords: 1800 })
    expect(mockedSetVerbatimWindowWords).toHaveBeenCalledWith(1800)
  })

  it('returns 400 when verbatimWindowWords is not a number', async () => {
    const response = await PUT(makeRequest({ verbatimWindowWords: 'lots' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedSetVerbatimWindowWords).not.toHaveBeenCalled()
  })

  it('returns 400 when verbatimWindowWords is zero or negative', async () => {
    const response = await PUT(makeRequest({ verbatimWindowWords: 0 }))

    expect(response.status).toBe(400)
    expect(mockedSetVerbatimWindowWords).not.toHaveBeenCalled()
  })

  it('returns 400 when verbatimWindowWords is not an integer', async () => {
    const response = await PUT(makeRequest({ verbatimWindowWords: 12.5 }))

    expect(response.status).toBe(400)
    expect(mockedSetVerbatimWindowWords).not.toHaveBeenCalled()
  })

  it('returns 400 when verbatimWindowWords is missing', async () => {
    const response = await PUT(makeRequest({}))

    expect(response.status).toBe(400)
    expect(mockedSetVerbatimWindowWords).not.toHaveBeenCalled()
  })

})
