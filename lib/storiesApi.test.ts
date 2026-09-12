import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)
import { fetchStories, createStory, renameStory, updateStoryPresentation, deleteStory } from './storiesApi'

describe('storiesApi', () => {
  beforeEach(() => {
    vi.mocked(mockedFetch).mockReset()
  })

  it('fetchStories GETs /api/stories', async () => {
    vi.mocked(mockedFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ stories: [{ id: '1', title: 'A' }] }),
    } as Response)

    const stories = await fetchStories()
    expect(mockedFetch).toHaveBeenCalledWith('/api/stories')
    expect(stories).toEqual([{ id: '1', title: 'A' }])
  })

  it('createStory POSTs a title', async () => {
    vi.mocked(mockedFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ story: { id: '2', title: 'B' } }),
    } as Response)

    const story = await createStory('B')
    expect(mockedFetch).toHaveBeenCalledWith('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'B' }),
    })
    expect(story.title).toBe('B')
  })

  it('renameStory PUTs the new title', async () => {
    vi.mocked(mockedFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ story: { id: '2', title: 'C' } }),
    } as Response)

    await renameStory('2', 'C')
    expect(mockedFetch).toHaveBeenCalledWith('/api/stories/2', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'C' }),
    })
  })

  it('updateStoryPresentation PUTs the new presentation', async () => {
    vi.mocked(mockedFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ story: { id: '2', presentation: 'Un pitch.' } }),
    } as Response)

    await updateStoryPresentation('2', 'Un pitch.')
    expect(mockedFetch).toHaveBeenCalledWith('/api/stories/2', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presentation: 'Un pitch.' }),
    })
  })

  it('deleteStory DELETEs the story', async () => {
    vi.mocked(mockedFetch).mockResolvedValue({ ok: true } as Response)
    await deleteStory('2')
    expect(mockedFetch).toHaveBeenCalledWith('/api/stories/2', { method: 'DELETE' })
  })
})
