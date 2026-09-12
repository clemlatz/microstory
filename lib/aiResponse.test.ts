import { describe, it, expect, vi } from 'vitest'
import { fetchAiResponse, fetchMessages, resetConversation } from './aiResponse'
import { encodeChatStreamEvent, type ChatStreamEvent } from './chatStreamProtocol'
import type { Message } from './types'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

const messages: Message[] = [
  { id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 },
]

function ndjsonResponse(events: ChatStreamEvent[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encodeChatStreamEvent(event))
      }
      controller.close()
    },
  })
  return { ok: true, status: 200, body } as Response
}

describe('fetchAiResponse', () => {
  it('POSTs the full message history, streams chunks via onChunk, and resolves with the full content', async () => {
    mockedFetch.mockResolvedValue(
      ndjsonResponse([
        { type: 'chunk', text: 'Bon' },
        { type: 'chunk', text: 'jour' },
      ]),
    )

    const received: string[] = []
    const result = await fetchAiResponse('story-1', messages, (text) => received.push(text))

    expect(received).toEqual(['Bon', 'jour'])
    expect(result).toBe('Bonjour')
    expect(mockedFetch).toHaveBeenCalledWith(
      '/api/chat?storyId=story-1',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ messages }),
      }),
    )
  })

  it('throws with the server-provided message when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 502,
      body: null,
      json: () => Promise.resolve({ error: 'connect ECONNREFUSED' }),
    } as Response)

    await expect(fetchAiResponse('story-1', messages, () => {})).rejects.toThrow(
      'connect ECONNREFUSED',
    )
  })

  it('falls back to a status-based message when the error response has no JSON body', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      body: null,
      json: () => Promise.reject(new Error('not json')),
    } as Response)

    await expect(fetchAiResponse('story-1', messages, () => {})).rejects.toThrow('500')
  })

  it('forwards an AbortSignal to the underlying fetch call', async () => {
    mockedFetch.mockResolvedValue(ndjsonResponse([{ type: 'chunk', text: 'Bon' }]))
    const controller = new AbortController()

    await fetchAiResponse('story-1', messages, () => {}, controller.signal)

    expect(mockedFetch).toHaveBeenCalledWith(
      '/api/chat?storyId=story-1',
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('propagates a fetch rejection', async () => {
    mockedFetch.mockRejectedValue(new Error('network down'))

    await expect(fetchAiResponse('story-1', messages, () => {})).rejects.toThrow('network down')
  })

  it('throws with the server-provided message when the stream sends an error event', async () => {
    mockedFetch.mockResolvedValue(
      ndjsonResponse([
        { type: 'chunk', text: 'Bon' },
        { type: 'error', message: 'stream interrupted' },
      ]),
    )

    const received: string[] = []
    await expect(
      fetchAiResponse('story-1', messages, (text) => received.push(text)),
    ).rejects.toThrow('stream interrupted')
    expect(received).toEqual(['Bon'])
  })
})

describe('fetchMessages', () => {
  it('returns the messages from a successful response', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages }),
    } as Response)

    const result = await fetchMessages('story-1')

    expect(result).toEqual(messages)
    expect(mockedFetch).toHaveBeenCalledWith('/api/messages?storyId=story-1')
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 500 } as Response)

    await expect(fetchMessages('story-1')).rejects.toThrow()
  })
})

describe('resetConversation', () => {
  it('sends a DELETE request to /api/messages', async () => {
    mockedFetch.mockResolvedValue({ ok: true } as Response)

    await resetConversation('story-1')

    expect(mockedFetch).toHaveBeenCalledWith('/api/messages?storyId=story-1', {
      method: 'DELETE',
    })
  })

  it('throws when the response is not ok', async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 500 } as Response)

    await expect(resetConversation('story-1')).rejects.toThrow()
  })
})
