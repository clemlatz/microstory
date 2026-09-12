import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/messagesRepository', () => ({
  getAllMessages: vi.fn(),
}))

vi.mock('@/lib/conversationSummariesRepository', () => ({
  getAllConversationSummaries: vi.fn(),
}))

vi.mock('@/lib/settingsRepository', () => ({
  getConversationSummary: vi.fn(),
}))

import { GET } from './route'
import { getAllMessages } from '@/lib/messagesRepository'
import { getAllConversationSummaries } from '@/lib/conversationSummariesRepository'
import { getConversationSummary } from '@/lib/settingsRepository'

const mockedGetAllMessages = vi.mocked(getAllMessages)
const mockedGetAllConversationSummaries = vi.mocked(getAllConversationSummaries)
const mockedGetConversationSummary = vi.mocked(getConversationSummary)

function makeRequest(): Request {
  return new Request('http://localhost/api/history?storyId=test-story')
}

function makeRequestWithoutStoryId(): Request {
  return new Request('http://localhost/api/history')
}

describe('GET /api/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the full message history, every summary, and the active cutoff id', async () => {
    const messages = [
      { id: 'msg-1', role: 'user' as const, content: 'Bonjour', timestamp: 1 },
      { id: 'msg-2', role: 'assistant' as const, content: '[TEXTE]Il pleuvait.[/TEXTE]', timestamp: 2 },
    ]
    const summaries = [
      { id: 'sum-1', content: 'Résumé.', cutoffMessageId: 'msg-1', createdAt: 10, type: 'auto' as const },
    ]
    mockedGetAllMessages.mockReturnValue(messages)
    mockedGetAllConversationSummaries.mockReturnValue(summaries)
    mockedGetConversationSummary.mockReturnValue({ summary: 'Résumé.', cutoffId: 'msg-1' })

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ messages, summaries, activeCutoffId: 'msg-1' })
  })

  it('returns activeCutoffId null when no summary is currently active', async () => {
    mockedGetAllMessages.mockReturnValue([])
    mockedGetAllConversationSummaries.mockReturnValue([])
    mockedGetConversationSummary.mockReturnValue({ summary: '', cutoffId: null })

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data).toEqual({ messages: [], summaries: [], activeCutoffId: null })
  })



  it('returns 400 when storyId is missing', async () => {
    const response = await GET(makeRequestWithoutStoryId())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedGetAllMessages).not.toHaveBeenCalled()
  })
})
