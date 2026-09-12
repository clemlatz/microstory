import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_PATH', ':memory:')

describe('PUT/DELETE /api/stories/[id]', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('PUT renames a story', async () => {
    const { createStory } = await import('@/lib/storiesRepository')
    const story = createStory('Old')

    const { PUT } = await import('./route')
    const response = await PUT(
      new Request(`http://localhost/api/stories/${story.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: 'New' }),
      }),
      { params: Promise.resolve({ id: story.id }) },
    )
    expect(response.status).toBe(200)
    const { story: updated } = await response.json()
    expect(updated.title).toBe('New')
  })

  it('PUT 404s for an unknown id', async () => {
    const { PUT } = await import('./route')
    const response = await PUT(
      new Request('http://localhost/api/stories/missing', {
        method: 'PUT',
        body: JSON.stringify({ title: 'New' }),
      }),
      { params: Promise.resolve({ id: 'missing' }) },
    )
    expect(response.status).toBe(404)
  })

  it('DELETE removes a story', async () => {
    const { createStory, getStoryById } = await import('@/lib/storiesRepository')
    const story = createStory('To delete')

    const { DELETE } = await import('./route')
    const response = await DELETE(
      new Request(`http://localhost/api/stories/${story.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: story.id }) },
    )
    expect(response.status).toBe(200)
    expect(getStoryById(story.id)).toBeNull()
  })
})
