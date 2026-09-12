import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))
import type { ChatStreamEvent } from '@/lib/chatStreamProtocol'

import { GET } from './route'
import { startGeneration, publishChunk, finishGeneration } from '@/lib/generationState'

const STORY_ID = 'story-1'

function makeRequest(storyId: string | null = STORY_ID): Request {
  const url = storyId
    ? `http://localhost/api/chat/resume?storyId=${storyId}`
    : 'http://localhost/api/chat/resume'
  return new Request(url)
}

async function readAllEvents(response: Response): Promise<ChatStreamEvent[]> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const events: ChatStreamEvent[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line) events.push(JSON.parse(line) as ChatStreamEvent)
    }
  }
  return events
}

describe('GET /api/chat/resume', () => {
  beforeEach(() => {
    finishGeneration(STORY_ID)
  })

  it('returns 204 when no generation is in progress', async () => {
    const response = await GET(makeRequest())
    expect(response.status).toBe(204)
  })

  it('replays the buffered content and then further chunks until done', async () => {
    startGeneration(STORY_ID)
    publishChunk(STORY_ID, 'Bon')

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)

    publishChunk(STORY_ID, 'jour')
    finishGeneration(STORY_ID)

    const events = await readAllEvents(response)
    expect(events).toEqual([
      { type: 'chunk', text: 'Bon' },
      { type: 'chunk', text: 'jour' },
      { type: 'done' },
    ])
  })


  it('returns 400 when storyId is missing', async () => {
    const response = await GET(makeRequest(null))

    expect(response.status).toBe(400)
  })
})
