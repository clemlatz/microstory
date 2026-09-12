import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchSummary } from './summarizeApi'
import { encodeChatStreamEvent, type ChatStreamEvent } from './chatStreamProtocol'

const mockedFetch = vi.fn()
vi.stubGlobal('fetch', mockedFetch)

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

describe('fetchSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockedFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs via mockedFetch, streams chunks via onChunk, and resolves with the full summary', async () => {
    const mockedAuthorizedFetch = vi.mocked(mockedFetch)
    mockedAuthorizedFetch.mockResolvedValue(
      ndjsonResponse([
        { type: 'chunk', text: 'Un bref' },
        { type: 'chunk', text: ' résumé.' },
      ]),
    )

    const received: string[] = []
    const result = await fetchSummary('story-1', (text) => received.push(text))

    expect(received).toEqual(['Un bref', ' résumé.'])
    expect(result).toBe('Un bref résumé.')
    expect(mockedAuthorizedFetch).toHaveBeenCalledWith('/api/summarize?storyId=story-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  })

  it('throws with the server-provided error message when the response is not ok', async () => {
    const mockedAuthorizedFetch = vi.mocked(mockedFetch)
    mockedAuthorizedFetch.mockResolvedValue({
      ok: false,
      status: 400,
      body: null,
      json: () => Promise.resolve({ error: 'no new passages to summarize' }),
    } as Response)

    await expect(fetchSummary('story-1', () => {})).rejects.toThrow(
      'no new passages to summarize',
    )
  })

  it('throws with the server-provided message when the stream sends an error event', async () => {
    const mockedAuthorizedFetch = vi.mocked(mockedFetch)
    mockedAuthorizedFetch.mockResolvedValue(
      ndjsonResponse([
        { type: 'chunk', text: 'Un bref' },
        { type: 'error', message: 'stream interrupted' },
      ]),
    )

    const received: string[] = []
    await expect(fetchSummary('story-1', (text) => received.push(text))).rejects.toThrow(
      'stream interrupted',
    )
    expect(received).toEqual(['Un bref'])
  })
})
