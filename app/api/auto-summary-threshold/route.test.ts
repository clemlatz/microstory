import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/settingsRepository', () => ({
  getAutoSummaryThresholdWords: vi.fn(),
  setAutoSummaryThresholdWords: vi.fn(),
}))

import { GET, PUT } from './route'
import { getAutoSummaryThresholdWords, setAutoSummaryThresholdWords } from '@/lib/settingsRepository'

const mockedGetAutoSummaryThresholdWords = vi.mocked(getAutoSummaryThresholdWords)
const mockedSetAutoSummaryThresholdWords = vi.mocked(setAutoSummaryThresholdWords)

function makeRequest(body?: unknown): Request {
  return new Request('http://localhost/api/auto-summary-threshold', {
    method: body ? 'PUT' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/auto-summary-threshold', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the auto-summary threshold words from the repository', async () => {
    mockedGetAutoSummaryThresholdWords.mockReturnValue(5000)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ autoSummaryThresholdWords: 5000 })
  })

})

describe('PUT /api/auto-summary-threshold', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves the auto-summary threshold words and returns it', async () => {
    mockedGetAutoSummaryThresholdWords.mockReturnValue(3000)

    const response = await PUT(makeRequest({ autoSummaryThresholdWords: 3000 }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ autoSummaryThresholdWords: 3000 })
    expect(mockedSetAutoSummaryThresholdWords).toHaveBeenCalledWith(3000)
  })

  it('returns 400 when autoSummaryThresholdWords is not a number', async () => {
    const response = await PUT(makeRequest({ autoSummaryThresholdWords: 'lots' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedSetAutoSummaryThresholdWords).not.toHaveBeenCalled()
  })

  it('returns 400 when autoSummaryThresholdWords is zero or negative', async () => {
    const response = await PUT(makeRequest({ autoSummaryThresholdWords: 0 }))

    expect(response.status).toBe(400)
    expect(mockedSetAutoSummaryThresholdWords).not.toHaveBeenCalled()
  })

  it('returns 400 when autoSummaryThresholdWords is not an integer', async () => {
    const response = await PUT(makeRequest({ autoSummaryThresholdWords: 12.5 }))

    expect(response.status).toBe(400)
    expect(mockedSetAutoSummaryThresholdWords).not.toHaveBeenCalled()
  })

  it('returns 400 when autoSummaryThresholdWords is missing', async () => {
    const response = await PUT(makeRequest({}))

    expect(response.status).toBe(400)
    expect(mockedSetAutoSummaryThresholdWords).not.toHaveBeenCalled()
  })

})
