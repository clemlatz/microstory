import { describe, it, expect, vi } from 'vitest'
import { persistConversationSummary } from './conversationSummaryApi'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

describe('persistConversationSummary', () => {
  it('sends a PUT request with the summary', async () => {
    mockedFetch.mockResolvedValue({ ok: true } as Response)

    await persistConversationSummary('story-1', 'Résumé complet.')

    expect(mockedFetch).toHaveBeenCalledWith('/api/conversation-summary?storyId=story-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: 'Résumé complet.' }),
    })
  })

  it('throws with the server-provided error message when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'summary must be a non-empty string' }),
    } as Response)

    await expect(persistConversationSummary('story-1', '')).rejects.toThrow(
      'summary must be a non-empty string',
    )
  })

  it('falls back to a generic error message when the body is not JSON', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(persistConversationSummary('story-1', 'x')).rejects.toThrow(
      'Conversation summary request failed with status 500',
    )
  })
})
