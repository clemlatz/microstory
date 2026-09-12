import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

import { POST } from './route'
import { startGeneration, finishGeneration } from '@/lib/generationState'

const STORY_ID = 'story-1'

function makeRequest(storyId: string | null = STORY_ID): Request {
  const url = storyId
    ? `http://localhost/api/chat/stop?storyId=${storyId}`
    : 'http://localhost/api/chat/stop'
  return new Request(url, { method: 'POST' })
}

describe('POST /api/chat/stop', () => {
  beforeEach(() => {
    finishGeneration(STORY_ID)
  })

  it('stops an in-progress generation', async () => {
    const signal = startGeneration(STORY_ID)!

    const response = await POST(makeRequest())
    const data = await response.json()

    expect(data).toEqual({ stopped: true })
    expect(signal.aborted).toBe(true)
  })

  it('reports nothing to stop when no generation is in progress', async () => {
    const response = await POST(makeRequest())
    const data = await response.json()

    expect(data).toEqual({ stopped: false })
  })


  it('returns 400 when storyId is missing', async () => {
    const response = await POST(makeRequest(null))

    expect(response.status).toBe(400)
  })
})
