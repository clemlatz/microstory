import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/messagesRepository', () => ({
  getAllMessages: vi.fn(),
}))

vi.mock('@/lib/buildSystemPrompt', () => ({
  buildSystemMessages: vi.fn(),
}))

vi.mock('@/lib/conversationCompaction', () => ({
  getCurrentPromptMessages: vi.fn(),
  messagesAfterCutoff: vi.fn(),
}))

vi.mock('@/lib/settingsRepository', () => ({
  getConversationSummary: vi.fn(),
  getAutoSummaryThresholdWords: vi.fn(),
}))

vi.mock('@/lib/verbatimWindow', () => ({
  countWords: vi.fn(),
}))

vi.mock('@/lib/llmClient', () => ({
  countPromptTokens: vi.fn(),
  getModelContextWindow: vi.fn(),
  getModelLoadState: vi.fn(),
  getConfiguredModelName: vi.fn(),
}))

import { GET } from './route'
import { getAllMessages } from '@/lib/messagesRepository'
import { buildSystemMessages } from '@/lib/buildSystemPrompt'
import { getCurrentPromptMessages, messagesAfterCutoff } from '@/lib/conversationCompaction'
import { getConversationSummary, getAutoSummaryThresholdWords } from '@/lib/settingsRepository'
import { countWords } from '@/lib/verbatimWindow'
import { countPromptTokens, getModelContextWindow, getModelLoadState, getConfiguredModelName } from '@/lib/llmClient'

const mockedGetAllMessages = vi.mocked(getAllMessages)
const mockedBuildSystemMessages = vi.mocked(buildSystemMessages)
const mockedGetCurrentPromptMessages = vi.mocked(getCurrentPromptMessages)
const mockedMessagesAfterCutoff = vi.mocked(messagesAfterCutoff)
const mockedGetConversationSummary = vi.mocked(getConversationSummary)
const mockedGetAutoSummaryThresholdWords = vi.mocked(getAutoSummaryThresholdWords)
const mockedCountWords = vi.mocked(countWords)
const mockedCountPromptTokens = vi.mocked(countPromptTokens)
const mockedGetModelContextWindow = vi.mocked(getModelContextWindow)
const mockedGetModelLoadState = vi.mocked(getModelLoadState)
const mockedGetConfiguredModelName = vi.mocked(getConfiguredModelName)

function makeRequest(): Request {
  return new Request('http://localhost/api/context-usage?storyId=test-story')
}

function makeRequestWithoutStoryId(): Request {
  return new Request('http://localhost/api/context-usage')
}

describe('GET /api/context-usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetModelLoadState.mockResolvedValue({ loaded: true, isLoading: false })
    mockedGetConfiguredModelName.mockReturnValue('local-model')
    mockedGetCurrentPromptMessages.mockImplementation((_storyId, baseSystemMessages, messages) => ({
      systemMessages: baseSystemMessages,
      promptMessages: messages,
    }))
    mockedGetConversationSummary.mockReturnValue({ summary: '', cutoffId: null })
    mockedMessagesAfterCutoff.mockImplementation((messages) => messages)
    mockedCountWords.mockReturnValue(0)
    mockedGetAutoSummaryThresholdWords.mockReturnValue(5000)
  })

  it('returns the used and max token counts, plus the pending/threshold word counts', async () => {
    mockedBuildSystemMessages.mockReturnValue([
      { role: 'system', content: 'Instructions de canal.' },
      { role: 'system', content: 'Tu es un auteur de roman policier.' },
    ])
    const messages = [{ id: '1', role: 'user' as const, content: 'Bonjour', timestamp: 1000 }]
    mockedGetAllMessages.mockReturnValue(messages)
    mockedCountPromptTokens.mockResolvedValue(14320)
    mockedGetModelContextWindow.mockResolvedValue(32768)
    mockedGetConversationSummary.mockReturnValue({ summary: '', cutoffId: 'c1' })
    mockedMessagesAfterCutoff.mockReturnValue(messages)
    mockedCountWords.mockReturnValue(3)
    mockedGetAutoSummaryThresholdWords.mockReturnValue(5000)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      usedTokens: 14320,
      maxTokens: 32768,
      pendingWords: 3,
      autoSummaryThresholdWords: 5000,
      modelName: 'local-model',
      modelLoaded: true,
      modelIsLoading: false,
    })
    expect(mockedMessagesAfterCutoff).toHaveBeenCalledWith(messages, 'c1')
    expect(mockedBuildSystemMessages).toHaveBeenCalledWith('test-story')
    expect(mockedGetAllMessages).toHaveBeenCalledWith('test-story')
    expect(mockedGetCurrentPromptMessages).toHaveBeenCalledWith(
      'test-story',
      [
        { role: 'system', content: 'Instructions de canal.' },
        { role: 'system', content: 'Tu es un auteur de roman policier.' },
      ],
      messages,
    )
    expect(mockedCountPromptTokens).toHaveBeenCalledWith(
      'Instructions de canal.\n\nTu es un auteur de roman policier.',
      messages,
    )
  })

  it('returns maxTokens: null without erroring when the model context window is unavailable', async () => {
    mockedBuildSystemMessages.mockReturnValue([])
    mockedGetAllMessages.mockReturnValue([])
    mockedCountPromptTokens.mockResolvedValue(500)
    mockedGetModelContextWindow.mockResolvedValue(null)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({ usedTokens: 500, maxTokens: null })
  })

  it('reflects a compacted prompt when getCurrentPromptMessages returns a reduced set', async () => {
    mockedBuildSystemMessages.mockReturnValue([{ role: 'system', content: 'Instructions.' }])
    mockedGetAllMessages.mockReturnValue([
      { id: '1', role: 'user' as const, content: 'Bonjour', timestamp: 1000 },
      { id: '2', role: 'assistant' as const, content: 'Salut', timestamp: 2000 },
    ])
    mockedGetCurrentPromptMessages.mockReturnValue({
      systemMessages: [
        { role: 'system', content: 'Instructions.' },
        { role: 'system', content: "Résumé de l'histoire jusqu'ici." },
      ],
      promptMessages: [{ id: '2', role: 'assistant' as const, content: 'Salut', timestamp: 2000 }],
    })
    mockedCountPromptTokens.mockResolvedValue(500)
    mockedGetModelContextWindow.mockResolvedValue(32768)

    await GET(makeRequest())

    expect(mockedCountPromptTokens).toHaveBeenCalledWith(
      "Instructions.\n\nRésumé de l'histoire jusqu'ici.",
      [{ id: '2', role: 'assistant', content: 'Salut', timestamp: 2000 }],
    )
  })

  it('passes an empty system text when there are no system messages', async () => {
    mockedBuildSystemMessages.mockReturnValue([])
    mockedGetAllMessages.mockReturnValue([])
    mockedCountPromptTokens.mockResolvedValue(0)
    mockedGetModelContextWindow.mockResolvedValue(32768)

    await GET(makeRequest())

    expect(mockedCountPromptTokens).toHaveBeenCalledWith('', [])
  })

  it('reports the model as loading and returns null load fields when the model is absent from the status response', async () => {
    mockedBuildSystemMessages.mockReturnValue([])
    mockedGetAllMessages.mockReturnValue([])
    mockedCountPromptTokens.mockResolvedValue(0)
    mockedGetModelContextWindow.mockResolvedValue(32768)
    mockedGetModelLoadState.mockResolvedValue({ loaded: false, isLoading: true })

    const loadingResponse = await GET(makeRequest())
    const loadingData = await loadingResponse.json()
    expect(loadingData).toMatchObject({ modelLoaded: false, modelIsLoading: true })

    mockedGetModelLoadState.mockResolvedValue(null)
    const unavailableResponse = await GET(makeRequest())
    const unavailableData = await unavailableResponse.json()
    expect(unavailableData).toMatchObject({ modelLoaded: null, modelIsLoading: null })
  })

  it('returns a 502 with the underlying error message when the LLM server call fails', async () => {
    mockedBuildSystemMessages.mockReturnValue([])
    mockedGetAllMessages.mockReturnValue([])
    mockedCountPromptTokens.mockRejectedValue(new Error('connect ECONNREFUSED'))

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toBe('connect ECONNREFUSED')
  })




  it('returns 400 when storyId is missing', async () => {
    const response = await GET(makeRequestWithoutStoryId())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedGetAllMessages).not.toHaveBeenCalled()
  })
})
