import { describe, expect, it, vi, beforeEach } from 'vitest'
import JSZip from 'jszip'

vi.stubEnv('DATABASE_PATH', ':memory:')

describe('GET /api/stories/[id]/export', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns a downloadable zip archive of the story', async () => {
    const { createStory } = await import('@/lib/storiesRepository')
    const story = createStory('Les Brumes de Kaldheim')

    const { GET } = await import('./route')
    const response = await GET(new Request(`http://localhost/api/stories/${story.id}/export`), {
      params: Promise.resolve({ id: story.id }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/zip')
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="les-brumes-de-kaldheim-backup.zip"',
    )

    const buffer = Buffer.from(await response.arrayBuffer())
    const zip = await JSZip.loadAsync(buffer)
    expect(Object.keys(zip.files)).toContain('presentation.md')
  })

  it('404s for an unknown story id', async () => {
    const { GET } = await import('./route')
    const response = await GET(new Request('http://localhost/api/stories/missing/export'), {
      params: Promise.resolve({ id: 'missing' }),
    })
    expect(response.status).toBe(404)
  })
})
