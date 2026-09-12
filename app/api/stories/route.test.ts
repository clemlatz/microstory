import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_PATH', ':memory:')

describe('GET/POST /api/stories', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('POST creates a story and GET lists it', async () => {
    const { POST, GET } = await import('./route')

    const postResponse = await POST(
      new Request('http://localhost/api/stories', {
        method: 'POST',
        body: JSON.stringify({ title: 'Ma nouvelle histoire' }),
      }),
    )
    expect(postResponse.status).toBe(200)
    const { story } = await postResponse.json()
    expect(story.title).toBe('Ma nouvelle histoire')

    const getResponse = await GET()
    const { stories } = await getResponse.json()
    expect(stories).toHaveLength(1)
    expect(stories[0].id).toBe(story.id)
  })

  it('POST rejects a blank title', async () => {
    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost/api/stories', {
        method: 'POST',
        body: JSON.stringify({ title: '  ' }),
      }),
    )
    expect(response.status).toBe(400)
  })
})
