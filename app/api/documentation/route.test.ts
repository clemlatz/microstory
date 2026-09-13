import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/documentationRepository', () => ({
  getAllDocumentationEntries: vi.fn(),
  createDocumentationEntry: vi.fn(),
}))

import { GET, POST } from './route'
import { getAllDocumentationEntries, createDocumentationEntry } from '@/lib/documentationRepository'

const mockedGetAll = vi.mocked(getAllDocumentationEntries)
const mockedCreate = vi.mocked(createDocumentationEntry)

function makeRequest(body?: unknown, storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null ? 'http://localhost/api/documentation' : `http://localhost/api/documentation?storyId=${storyId}`
  return new Request(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/documentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the documentation entries from the repository', async () => {
    const documentation = [
      { id: '1', title: 'Recherche', content: 'Contenu', url: null, createdAt: 1000, updatedAt: 1000 },
    ]
    mockedGetAll.mockReturnValue(documentation)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ documentation })
    expect(mockedGetAll).toHaveBeenCalledWith('test-story')
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await GET(makeRequest(undefined, null))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedGetAll).not.toHaveBeenCalled()
  })
})

describe('POST /api/documentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a documentation entry and returns 201', async () => {
    const entry = {
      id: '1',
      title: 'Recherche',
      content: 'Contenu',
      url: null,
      createdAt: 1000,
      updatedAt: 1000,
    }
    mockedCreate.mockReturnValue(entry)

    const response = await POST(makeRequest({ title: 'Recherche', content: 'Contenu' }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual({ entry })
    expect(mockedCreate).toHaveBeenCalledWith(
      { title: 'Recherche', content: 'Contenu', url: null },
      'test-story',
    )
  })

  it('trims whitespace before creating, including the url', async () => {
    const entry = {
      id: '1',
      title: 'Recherche',
      content: 'Contenu',
      url: 'https://example.com',
      createdAt: 1000,
      updatedAt: 1000,
    }
    mockedCreate.mockReturnValue(entry)

    await POST(makeRequest({ title: '  Recherche  ', content: '  Contenu  ', url: '  https://example.com  ' }))

    expect(mockedCreate).toHaveBeenCalledWith(
      { title: 'Recherche', content: 'Contenu', url: 'https://example.com' },
      'test-story',
    )
  })

  it('stores a null url when omitted or blank', async () => {
    const entry = {
      id: '1',
      title: 'Recherche',
      content: 'Contenu',
      url: null,
      createdAt: 1000,
      updatedAt: 1000,
    }
    mockedCreate.mockReturnValue(entry)

    await POST(makeRequest({ title: 'Recherche', content: 'Contenu', url: '   ' }))

    expect(mockedCreate).toHaveBeenCalledWith({ title: 'Recherche', content: 'Contenu', url: null }, 'test-story')
  })

  it('returns 400 when title is missing', async () => {
    const response = await POST(makeRequest({ content: 'Contenu' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('returns 400 when url is not a string', async () => {
    const response = await POST(makeRequest({ title: 'Recherche', content: 'Contenu', url: 42 }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('creates an entry with empty content when none is given', async () => {
    const entry = { id: '1', title: 'Recherche', content: '', url: null, createdAt: 1000, updatedAt: 1000 }
    mockedCreate.mockReturnValue(entry)

    const response = await POST(makeRequest({ title: 'Recherche' }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual({ entry })
    expect(mockedCreate).toHaveBeenCalledWith({ title: 'Recherche', content: '', url: null }, 'test-story')
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await POST(makeRequest({ title: 'Recherche', content: 'Contenu' }, null))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedCreate).not.toHaveBeenCalled()
  })
})
