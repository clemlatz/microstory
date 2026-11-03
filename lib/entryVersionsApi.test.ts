import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchEntryVersions } from './entryVersionsApi'

describe('fetchEntryVersions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the versions from the route matching the entry kind', async () => {
    const versions = [{ id: 'v1', title: 'T', content: 'C', createdAt: 1 }]
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ versions }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchEntryVersions('note', 's1', 'n1')).resolves.toEqual(versions)
    expect(fetchMock).toHaveBeenCalledWith('/api/notes/n1/versions?storyId=s1')

    await fetchEntryVersions('character', 's1', 'c1')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/characters/c1/versions?storyId=s1')

    await fetchEntryVersions('documentation', 's1', 'd1')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/documentation/d1/versions?storyId=s1')
  })

  it('throws with the server error message on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'story not found' }) }))

    await expect(fetchEntryVersions('note', 's1', 'n1')).rejects.toThrow('story not found')
  })
})
