import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/settingsRepository', () => ({
  getWriterPrompt: vi.fn(),
  setWriterPrompt: vi.fn(),
}))

import { GET, PUT } from './route'
import { getWriterPrompt, setWriterPrompt } from '@/lib/settingsRepository'

const mockedGetWriterPrompt = vi.mocked(getWriterPrompt)
const mockedSetWriterPrompt = vi.mocked(setWriterPrompt)

function makeRequest(body?: unknown, storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null
      ? 'http://localhost/api/writer-prompt'
      : `http://localhost/api/writer-prompt?storyId=${storyId}`
  return new Request(url, {
    method: body ? 'PUT' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/writer-prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the writer prompt from the repository', async () => {
    mockedGetWriterPrompt.mockReturnValue('Tu es un auteur de roman policier.')

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ writerPrompt: 'Tu es un auteur de roman policier.' })
    expect(mockedGetWriterPrompt).toHaveBeenCalledWith('test-story')
  })



  it('returns 400 when storyId is missing', async () => {
    const response = await GET(makeRequest(undefined, null))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedGetWriterPrompt).not.toHaveBeenCalled()
  })
})

describe('PUT /api/writer-prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves the writer prompt and returns it', async () => {
    mockedGetWriterPrompt.mockReturnValue('Nouveau prompt')

    const response = await PUT(makeRequest({ writerPrompt: 'Nouveau prompt' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ writerPrompt: 'Nouveau prompt' })
    expect(mockedSetWriterPrompt).toHaveBeenCalledWith('test-story', 'Nouveau prompt')
  })

  it('trims whitespace before saving', async () => {
    mockedGetWriterPrompt.mockReturnValue('Nouveau prompt')

    await PUT(makeRequest({ writerPrompt: '  Nouveau prompt  ' }))

    expect(mockedSetWriterPrompt).toHaveBeenCalledWith('test-story', 'Nouveau prompt')
  })

  it('accepts an empty string to clear the prompt', async () => {
    mockedGetWriterPrompt.mockReturnValue('')

    const response = await PUT(makeRequest({ writerPrompt: '' }))

    expect(response.status).toBe(200)
    expect(mockedSetWriterPrompt).toHaveBeenCalledWith('test-story', '')
  })

  it('returns 400 when writerPrompt is not a string', async () => {
    const response = await PUT(makeRequest({ writerPrompt: 42 }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedSetWriterPrompt).not.toHaveBeenCalled()
  })

  it('returns 400 when writerPrompt is missing', async () => {
    const response = await PUT(makeRequest({}))

    expect(response.status).toBe(400)
    expect(mockedSetWriterPrompt).not.toHaveBeenCalled()
  })



  it('returns 400 when storyId is missing', async () => {
    const response = await PUT(makeRequest({ writerPrompt: 'X' }, null))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedSetWriterPrompt).not.toHaveBeenCalled()
  })
})
