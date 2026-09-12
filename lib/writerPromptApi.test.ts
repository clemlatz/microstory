import { describe, it, expect, vi } from 'vitest'
import { fetchWriterPrompt, updateWriterPrompt } from './writerPromptApi'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

describe('fetchWriterPrompt', () => {
  it('returns the writer prompt from a successful response', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ writerPrompt: 'Tu es un auteur de roman policier.' }),
    } as Response)

    const result = await fetchWriterPrompt('story-1')

    expect(result).toBe('Tu es un auteur de roman policier.')
    expect(mockedFetch).toHaveBeenCalledWith('/api/writer-prompt?storyId=story-1')
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(fetchWriterPrompt('story-1')).rejects.toThrow()
  })
})

describe('updateWriterPrompt', () => {
  it('sends a PUT request and returns the saved prompt', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ writerPrompt: 'Nouveau prompt' }),
    } as Response)

    const result = await updateWriterPrompt('story-1', 'Nouveau prompt')

    expect(result).toBe('Nouveau prompt')
    expect(mockedFetch).toHaveBeenCalledWith('/api/writer-prompt?storyId=story-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writerPrompt: 'Nouveau prompt' }),
    })
  })

  it('throws with the server-provided error message when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'writerPrompt must be a string' }),
    } as Response)

    await expect(updateWriterPrompt('story-1', 'x')).rejects.toThrow(
      'writerPrompt must be a string',
    )
  })
})
