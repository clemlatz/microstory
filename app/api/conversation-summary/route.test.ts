import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/settingsRepository', () => ({
  setConversationSummary: vi.fn(),
  getConversationSummary: vi.fn(),
  getVerbatimWindowWords: vi.fn(),
}))

vi.mock('@/lib/conversationSummariesRepository', () => ({
  addConversationSummary: vi.fn(),
}))

vi.mock('@/lib/messagesRepository', () => ({
  getAllMessages: vi.fn(),
}))

import { GET, PUT } from './route'
import { getConversationSummary, setConversationSummary, getVerbatimWindowWords } from '@/lib/settingsRepository'
import { addConversationSummary } from '@/lib/conversationSummariesRepository'
import { getAllMessages } from '@/lib/messagesRepository'

const mockedGetConversationSummary = vi.mocked(getConversationSummary)
const mockedSetConversationSummary = vi.mocked(setConversationSummary)
const mockedGetVerbatimWindowWords = vi.mocked(getVerbatimWindowWords)
const mockedAddConversationSummary = vi.mocked(addConversationSummary)
const mockedGetAllMessages = vi.mocked(getAllMessages)

function makeGetRequest(): Request {
  return new Request('http://localhost/api/conversation-summary?storyId=test-story')
}

function makeGetRequestWithoutStoryId(): Request {
  return new Request('http://localhost/api/conversation-summary')
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/conversation-summary?storyId=test-story', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeRequestWithoutStoryId(body: unknown): Request {
  return new Request('http://localhost/api/conversation-summary', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/conversation-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetConversationSummary.mockReturnValue({ summary: '', cutoffId: null })
    mockedGetVerbatimWindowWords.mockReturnValue(2500)
  })

  it('persists the summary with the id of the last message as the cutoff', async () => {
    mockedGetAllMessages.mockReturnValue([
      { id: 'msg-1', role: 'user', content: 'Bonjour', timestamp: 1 },
      { id: 'msg-2', role: 'assistant', content: '[TEXTE]Il pleuvait.[/TEXTE]', timestamp: 2 },
    ])

    const response = await PUT(makeRequest({ summary: 'Résumé complet.' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(mockedSetConversationSummary).toHaveBeenCalledWith('test-story', 'Résumé complet.', 'msg-2')
    expect(mockedAddConversationSummary).toHaveBeenCalledWith('Résumé complet.', 'msg-2', 'manual', 'test-story')
  })

  it('trims the summary before saving', async () => {
    mockedGetAllMessages.mockReturnValue([{ id: 'msg-1', role: 'user', content: 'Bonjour', timestamp: 1 }])

    await PUT(makeRequest({ summary: '  Résumé complet.  ' }))

    expect(mockedSetConversationSummary).toHaveBeenCalledWith('test-story', 'Résumé complet.', 'msg-1')
    expect(mockedAddConversationSummary).toHaveBeenCalledWith('Résumé complet.', 'msg-1', 'manual', 'test-story')
  })

  it('uses the last message before the verbatim window as the cutoff, not the very last message', async () => {
    mockedGetVerbatimWindowWords.mockReturnValue(3) // 3 words: only the very last message fits
    mockedGetAllMessages.mockReturnValue([
      { id: 'msg-1', role: 'user', content: 'Premier message ici', timestamp: 1 },
      { id: 'msg-2', role: 'user', content: 'Dernier message', timestamp: 2 },
    ])

    await PUT(makeRequest({ summary: 'Résumé.' }))

    expect(mockedSetConversationSummary).toHaveBeenCalledWith('test-story', 'Résumé.', 'msg-1')
    expect(mockedAddConversationSummary).toHaveBeenCalledWith('Résumé.', 'msg-1', 'manual', 'test-story')
  })

  it('returns 400 when summary is not a non-empty string', async () => {
    const response = await PUT(makeRequest({ summary: '   ' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedSetConversationSummary).not.toHaveBeenCalled()
  })

  it('returns 400 when summary is missing', async () => {
    const response = await PUT(makeRequest({}))

    expect(response.status).toBe(400)
    expect(mockedSetConversationSummary).not.toHaveBeenCalled()
  })

  it('returns 400 when there is no conversation history', async () => {
    mockedGetAllMessages.mockReturnValue([])

    const response = await PUT(makeRequest({ summary: 'Résumé complet.' }))

    expect(response.status).toBe(400)
    expect(mockedSetConversationSummary).not.toHaveBeenCalled()
  })



  it('returns 400 when storyId is missing', async () => {
    const response = await PUT(makeRequestWithoutStoryId({ summary: 'Résumé complet.' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedSetConversationSummary).not.toHaveBeenCalled()
  })
})

describe('GET /api/conversation-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the current summary and its cutoff id', async () => {
    mockedGetConversationSummary.mockReturnValue({ summary: 'Résumé complet.', cutoffId: 'msg-2' })

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ summary: 'Résumé complet.', cutoffId: 'msg-2' })
    expect(mockedGetConversationSummary).toHaveBeenCalledWith('test-story')
  })

  it('returns an empty summary and null cutoff when none is set', async () => {
    mockedGetConversationSummary.mockReturnValue({ summary: '', cutoffId: null })

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(data).toEqual({ summary: '', cutoffId: null })
  })



  it('returns 400 when storyId is missing', async () => {
    const response = await GET(makeGetRequestWithoutStoryId())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedGetConversationSummary).not.toHaveBeenCalled()
  })
})
