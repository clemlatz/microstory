import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/documentationRepository', () => ({
  updateDocumentationEntry: vi.fn(),
  deleteDocumentationEntry: vi.fn(),
}))

import { PUT, DELETE } from './route'
import { updateDocumentationEntry, deleteDocumentationEntry } from '@/lib/documentationRepository'

const mockedUpdate = vi.mocked(updateDocumentationEntry)
const mockedDelete = vi.mocked(deleteDocumentationEntry)

function makeRequest(body: unknown, storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null
      ? 'http://localhost/api/documentation/1'
      : `http://localhost/api/documentation/1?storyId=${storyId}`
  return new Request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null
      ? 'http://localhost/api/documentation/1'
      : `http://localhost/api/documentation/1?storyId=${storyId}`
  return new Request(url)
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PUT /api/documentation/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates the entry and returns it', async () => {
    const entry = {
      id: '1',
      title: 'Recherche révisée',
      content: 'Mise à jour',
      url: 'https://example.com',
      createdAt: 1000,
      updatedAt: 2000,
    }
    mockedUpdate.mockReturnValue(entry)

    const response = await PUT(
      makeRequest({ title: 'Recherche révisée', content: 'Mise à jour', url: 'https://example.com' }),
      context('1'),
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ entry })
    expect(mockedUpdate).toHaveBeenCalledWith('1', 'test-story', {
      title: 'Recherche révisée',
      content: 'Mise à jour',
      url: 'https://example.com',
    })
  })

  it('stores a null url when omitted', async () => {
    const entry = {
      id: '1',
      title: 'Recherche',
      content: 'Mise à jour',
      url: null,
      createdAt: 1000,
      updatedAt: 2000,
    }
    mockedUpdate.mockReturnValue(entry)

    await PUT(makeRequest({ title: 'Recherche', content: 'Mise à jour' }), context('1'))

    expect(mockedUpdate).toHaveBeenCalledWith('1', 'test-story', {
      title: 'Recherche',
      content: 'Mise à jour',
      url: null,
    })
  })

  it('returns 404 when the entry does not exist', async () => {
    mockedUpdate.mockReturnValue(null)

    const response = await PUT(makeRequest({ title: 'Recherche', content: 'X' }), context('missing'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBeTypeOf('string')
  })

  it('returns 400 when title is missing', async () => {
    const response = await PUT(makeRequest({ content: 'X' }), context('1'))

    expect(response.status).toBe(400)
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('returns 400 when url is not a string', async () => {
    const response = await PUT(makeRequest({ title: 'Recherche', content: 'X', url: 42 }), context('1'))

    expect(response.status).toBe(400)
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await PUT(makeRequest({ title: 'Recherche', content: 'X' }, null), context('1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedUpdate).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/documentation/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the entry and returns success', async () => {
    const response = await DELETE(makeDeleteRequest(), context('1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
    expect(mockedDelete).toHaveBeenCalledWith('1', 'test-story')
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await DELETE(makeDeleteRequest(null), context('1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedDelete).not.toHaveBeenCalled()
  })
})
