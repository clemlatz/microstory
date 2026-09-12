import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/conversationSummariesRepository', () => ({
  updateConversationSummary: vi.fn(),
  getAllConversationSummaries: vi.fn(),
}))

vi.mock('@/lib/settingsRepository', () => ({
  getConversationSummary: vi.fn(),
  setConversationSummary: vi.fn(),
}))

import { PUT } from './route'
import {
  updateConversationSummary,
  getAllConversationSummaries,
} from '@/lib/conversationSummariesRepository'
import { getConversationSummary, setConversationSummary } from '@/lib/settingsRepository'

const mockedUpdateConversationSummary = vi.mocked(updateConversationSummary)
const mockedGetAllConversationSummaries = vi.mocked(getAllConversationSummaries)
const mockedGetConversationSummary = vi.mocked(getConversationSummary)
const mockedSetConversationSummary = vi.mocked(setConversationSummary)

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/conversation-summaries/sum-1?storyId=test-story', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeRequestWithoutStoryId(body: unknown): Request {
  return new Request('http://localhost/api/conversation-summaries/sum-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PUT /api/conversation-summaries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('400s when content is missing or blank', async () => {
    const response = await PUT(makeRequest({ content: '   ' }), makeContext('sum-1'))
    expect(response.status).toBe(400)
    expect(mockedUpdateConversationSummary).not.toHaveBeenCalled()
  })

  it('404s when the summary does not exist', async () => {
    mockedUpdateConversationSummary.mockReturnValue(null)

    const response = await PUT(makeRequest({ content: 'Nouveau contenu.' }), makeContext('missing'))

    expect(response.status).toBe(404)
  })

  it('updates the summary and does not touch settings when it is not the active one', async () => {
    const updatedSummary = {
      id: 'sum-1',
      content: 'Contenu corrigé.',
      cutoffMessageId: 'msg-1',
      createdAt: 10,
      type: 'auto' as const,
    }
    mockedUpdateConversationSummary.mockReturnValue(updatedSummary)
    mockedGetAllConversationSummaries.mockReturnValue([
      updatedSummary,
      { id: 'sum-2', content: 'Autre.', cutoffMessageId: 'msg-3', createdAt: 20, type: 'auto' },
    ])
    mockedGetConversationSummary.mockReturnValue({ summary: 'Autre.', cutoffId: 'msg-3' })

    const response = await PUT(makeRequest({ content: 'Contenu corrigé.' }), makeContext('sum-1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.summary).toEqual(updatedSummary)
    expect(mockedSetConversationSummary).not.toHaveBeenCalled()
    expect(mockedUpdateConversationSummary).toHaveBeenCalledWith('sum-1', 'test-story', 'Contenu corrigé.')
  })

  it('also syncs settings.conversationSummary when the edited summary is the active one', async () => {
    const updatedSummary = {
      id: 'sum-2',
      content: 'Contenu corrigé.',
      cutoffMessageId: 'msg-3',
      createdAt: 20,
      type: 'auto' as const,
    }
    mockedUpdateConversationSummary.mockReturnValue(updatedSummary)
    mockedGetAllConversationSummaries.mockReturnValue([
      { id: 'sum-1', content: 'Autre.', cutoffMessageId: 'msg-1', createdAt: 10, type: 'auto' },
      updatedSummary,
    ])
    mockedGetConversationSummary.mockReturnValue({ summary: 'Ancien.', cutoffId: 'msg-3' })

    const response = await PUT(makeRequest({ content: 'Contenu corrigé.' }), makeContext('sum-2'))

    expect(response.status).toBe(200)
    expect(mockedSetConversationSummary).toHaveBeenCalledWith('test-story', 'Contenu corrigé.', 'msg-3')
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await PUT(makeRequestWithoutStoryId({ content: 'Contenu.' }), makeContext('sum-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedUpdateConversationSummary).not.toHaveBeenCalled()
  })
})
