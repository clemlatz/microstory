import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/messagesRepository', () => ({
  getAllMessages: vi.fn(),
  clearMessages: vi.fn(),
}))

vi.mock('@/lib/settingsRepository', () => ({
  clearConversationSummary: vi.fn(),
}))

vi.mock('@/lib/conversationSummariesRepository', () => ({
  clearConversationSummaries: vi.fn(),
}))

import { GET, DELETE } from './route'
import { getAllMessages, clearMessages } from '@/lib/messagesRepository'
import { clearConversationSummary } from '@/lib/settingsRepository'
import { clearConversationSummaries } from '@/lib/conversationSummariesRepository'
import { storyExists } from '@/lib/storiesRepository'

const mockedGetAllMessages = vi.mocked(getAllMessages)
const mockedClearMessages = vi.mocked(clearMessages)
const mockedClearConversationSummary = vi.mocked(clearConversationSummary)
const mockedClearConversationSummaries = vi.mocked(clearConversationSummaries)
const mockedStoryExists = vi.mocked(storyExists)

function makeRequest(storyId: string | null = 'test-story'): Request {
  const url =
    storyId === null
      ? 'http://localhost/api/messages'
      : `http://localhost/api/messages?storyId=${storyId}`
  return new Request(url)
}

describe('GET /api/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the messages from the repository', async () => {
    const messages = [{ id: '1', role: 'user' as const, content: 'Bonjour', timestamp: 1000 }]
    mockedGetAllMessages.mockReturnValue(messages)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ messages })
    expect(mockedGetAllMessages).toHaveBeenCalledWith('test-story')
  })



  it('returns 400 when storyId is missing', async () => {
    const response = await GET(makeRequest(null))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedGetAllMessages).not.toHaveBeenCalled()
  })

  it('returns 404 when storyId does not refer to an existing story', async () => {
    mockedStoryExists.mockReturnValueOnce(false)

    const response = await GET(makeRequest('missing-story'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'story not found' })
    expect(mockedGetAllMessages).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears the messages, the conversation summary, and the summary history, and returns success', async () => {
    const response = await DELETE(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
    expect(mockedClearMessages).toHaveBeenCalledTimes(1)
    expect(mockedClearConversationSummary).toHaveBeenCalledTimes(1)
    expect(mockedClearConversationSummaries).toHaveBeenCalledTimes(1)
  })


  it('returns 400 when storyId is missing', async () => {
    const response = await DELETE(makeRequest(null))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'storyId is required' })
    expect(mockedClearMessages).not.toHaveBeenCalled()
    expect(mockedClearConversationSummary).not.toHaveBeenCalled()
    expect(mockedClearConversationSummaries).not.toHaveBeenCalled()
  })

  it('returns 404 when storyId does not refer to an existing story', async () => {
    mockedStoryExists.mockReturnValueOnce(false)

    const response = await DELETE(makeRequest('missing-story'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'story not found' })
    expect(mockedClearMessages).not.toHaveBeenCalled()
    expect(mockedClearConversationSummary).not.toHaveBeenCalled()
    expect(mockedClearConversationSummaries).not.toHaveBeenCalled()
  })
})
