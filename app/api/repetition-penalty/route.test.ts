import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/settingsRepository', () => ({
  getRepetitionPenalty: vi.fn(),
  setRepetitionPenalty: vi.fn(),
}))

import { GET, PUT } from './route'
import { getRepetitionPenalty, setRepetitionPenalty } from '@/lib/settingsRepository'

const mockedGetRepetitionPenalty = vi.mocked(getRepetitionPenalty)
const mockedSetRepetitionPenalty = vi.mocked(setRepetitionPenalty)

function makeRequest(body?: unknown): Request {
  return new Request('http://localhost/api/repetition-penalty', {
    method: body ? 'PUT' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/repetition-penalty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the repetition penalty from the repository', async () => {
    mockedGetRepetitionPenalty.mockReturnValue(1.1)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ repetitionPenalty: 1.1 })
  })

})

describe('PUT /api/repetition-penalty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves the repetition penalty and returns it', async () => {
    mockedGetRepetitionPenalty.mockReturnValue(1.5)

    const response = await PUT(makeRequest({ repetitionPenalty: 1.5 }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ repetitionPenalty: 1.5 })
    expect(mockedSetRepetitionPenalty).toHaveBeenCalledWith(1.5)
  })

  it('returns 400 when repetitionPenalty is not a number', async () => {
    const response = await PUT(makeRequest({ repetitionPenalty: 'lots' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedSetRepetitionPenalty).not.toHaveBeenCalled()
  })

  it('returns 400 when repetitionPenalty is below the minimum', async () => {
    const response = await PUT(makeRequest({ repetitionPenalty: 0.5 }))

    expect(response.status).toBe(400)
    expect(mockedSetRepetitionPenalty).not.toHaveBeenCalled()
  })

  it('returns 400 when repetitionPenalty is above the maximum', async () => {
    const response = await PUT(makeRequest({ repetitionPenalty: 2.5 }))

    expect(response.status).toBe(400)
    expect(mockedSetRepetitionPenalty).not.toHaveBeenCalled()
  })

  it('accepts the boundary values', async () => {
    mockedGetRepetitionPenalty.mockReturnValue(1.0)
    const responseMin = await PUT(makeRequest({ repetitionPenalty: 1.0 }))
    expect(responseMin.status).toBe(200)

    mockedGetRepetitionPenalty.mockReturnValue(2.0)
    const responseMax = await PUT(makeRequest({ repetitionPenalty: 2.0 }))
    expect(responseMax.status).toBe(200)
  })

  it('returns 400 when repetitionPenalty is missing', async () => {
    const response = await PUT(makeRequest({}))

    expect(response.status).toBe(400)
    expect(mockedSetRepetitionPenalty).not.toHaveBeenCalled()
  })

})
