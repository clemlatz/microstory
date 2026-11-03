import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/charactersRepository', () => ({
  getCharacterVersions: vi.fn(),
}))

import { GET } from './route'
import { getCharacterVersions } from '@/lib/charactersRepository'

const mocked = vi.mocked(getCharacterVersions)

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/characters/[id]/versions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the versions of the entry', async () => {
    const versions = [{ id: 'v1', title: 'Titre', content: 'Ancien contenu', createdAt: 1000 }]
    mocked.mockReturnValue(versions)

    const response = await GET(new Request('http://localhost/api/characters/1/versions?storyId=s1'), context('1'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ versions })
    expect(mocked).toHaveBeenCalledWith('1', 's1')
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await GET(new Request('http://localhost/api/characters/1/versions'), context('1'))

    expect(response.status).toBe(400)
    expect(mocked).not.toHaveBeenCalled()
  })
})
