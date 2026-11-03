import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/notesRepository', () => ({
  getNoteVersions: vi.fn(),
}))

import { GET } from './route'
import { getNoteVersions } from '@/lib/notesRepository'

const mocked = vi.mocked(getNoteVersions)

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/notes/[id]/versions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the versions of the entry', async () => {
    const versions = [{ id: 'v1', title: 'Titre', content: 'Ancien contenu', createdAt: 1000 }]
    mocked.mockReturnValue(versions)

    const response = await GET(new Request('http://localhost/api/notes/1/versions?storyId=s1'), context('1'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ versions })
    expect(mocked).toHaveBeenCalledWith('1', 's1')
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await GET(new Request('http://localhost/api/notes/1/versions'), context('1'))

    expect(response.status).toBe(400)
    expect(mocked).not.toHaveBeenCalled()
  })
})
