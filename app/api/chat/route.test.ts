import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatStreamEvent } from '@/lib/chatStreamProtocol'

vi.mock('@/lib/llmClient', () => ({
  streamLlmReply: vi.fn(),
  countPromptTokens: vi.fn().mockResolvedValue(0),
  getModelLoadState: vi.fn().mockResolvedValue(null),
  getConfiguredModelName: vi.fn().mockReturnValue('test-model'),
}))

vi.mock('@/lib/messagesRepository', () => ({
  replaceMessages: vi.fn(),
  appendMessage: vi.fn(),
}))

vi.mock('@/lib/settingsRepository', () => ({
  getWriterPrompt: vi.fn(),
  getMaxStoryWords: vi.fn(),
  getRepetitionPenalty: vi.fn(),
}))

vi.mock('@/lib/charactersRepository', () => ({
  getAllCharacters: vi.fn(),
  buildCharactersSystemMessage: vi.fn(),
}))

vi.mock('@/lib/conversationCompaction', () => ({
  getCurrentPromptMessages: vi.fn(),
}))

vi.mock('@/lib/autoSummaryTrigger', () => ({
  maybeAutoSummarize: vi.fn(),
}))

vi.mock('@/lib/storiesRepository', () => ({
  touchStory: vi.fn(),
  storyExists: vi.fn(() => true),
}))

vi.mock('@/lib/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

import { POST } from './route'
import { streamLlmReply } from '@/lib/llmClient'
import { replaceMessages, appendMessage } from '@/lib/messagesRepository'
import { getWriterPrompt, getMaxStoryWords, getRepetitionPenalty } from '@/lib/settingsRepository'
import { getAllCharacters, buildCharactersSystemMessage } from '@/lib/charactersRepository'
import { getCurrentPromptMessages } from '@/lib/conversationCompaction'
import { maybeAutoSummarize } from '@/lib/autoSummaryTrigger'
import { touchStory, storyExists } from '@/lib/storiesRepository'
import { CHANNEL_SYSTEM_PROMPT } from '@/lib/channelSystemPrompt'
import { buildStoryWordLimitMessage } from '@/lib/storyWordLimitPrompt'
import { logWarn } from '@/lib/logger'

const mockedStreamLlmReply = vi.mocked(streamLlmReply)
const mockedReplaceMessages = vi.mocked(replaceMessages)
const mockedAppendMessage = vi.mocked(appendMessage)
const mockedGetWriterPrompt = vi.mocked(getWriterPrompt)
const mockedGetMaxStoryWords = vi.mocked(getMaxStoryWords)
const mockedGetRepetitionPenalty = vi.mocked(getRepetitionPenalty)
const mockedGetAllCharacters = vi.mocked(getAllCharacters)
const mockedBuildCharactersSystemMessage = vi.mocked(buildCharactersSystemMessage)
const mockedGetCurrentPromptMessages = vi.mocked(getCurrentPromptMessages)
const mockedMaybeAutoSummarize = vi.mocked(maybeAutoSummarize)
const mockedTouchStory = vi.mocked(touchStory)
const mockedStoryExists = vi.mocked(storyExists)
const STORY_ID = 'story-1'

function makeRequest(body: unknown, storyId: string | null = STORY_ID): Request {
  const url = storyId
    ? `http://localhost/api/chat?storyId=${storyId}`
    : 'http://localhost/api/chat'
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function* fakeStream(chunks: string[]): AsyncGenerator<string, void, void> {
  for (const chunk of chunks) {
    yield chunk
  }
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

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetWriterPrompt.mockReturnValue('')
    mockedGetMaxStoryWords.mockReturnValue(100)
    mockedGetRepetitionPenalty.mockReturnValue(1.1)
    mockedGetAllCharacters.mockReturnValue([])
    mockedBuildCharactersSystemMessage.mockReturnValue(null)
    mockedGetCurrentPromptMessages.mockImplementation((_storyId, baseSystemMessages, messages) => ({
      systemMessages: baseSystemMessages,
      promptMessages: messages,
    }))
    mockedMaybeAutoSummarize.mockResolvedValue(undefined)
  })

  it('streams the assistant reply chunks and persists the full message', async () => {
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Salut', ' toi']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    const response = await POST(request)
    const events = await readAllEvents(response)

    expect(response.status).toBe(200)
    expect(events).toEqual([
      { type: 'chunk', text: 'Salut' },
      { type: 'chunk', text: ' toi' },
      { type: 'done' },
    ])
    expect(mockedReplaceMessages).toHaveBeenCalledWith(STORY_ID, messages)
    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      [
        { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
        { role: 'system', content: buildStoryWordLimitMessage(100) },
        ...messages,
      ],
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
    expect(mockedAppendMessage).toHaveBeenCalledTimes(1)
    const appended = mockedAppendMessage.mock.calls[0][0]
    expect(appended.role).toBe('assistant')
    expect(appended.content).toBe('Salut toi')
    expect(mockedAppendMessage.mock.calls[0][1]).toBe(STORY_ID)
    expect(mockedTouchStory).toHaveBeenCalledWith(STORY_ID)
  })

  it('triggers the automatic summary check after a successful generation', async () => {
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Salut']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    const response = await POST(request)
    await readAllEvents(response)

    expect(mockedMaybeAutoSummarize).toHaveBeenCalledWith(STORY_ID)
  })

  it('does not wait for the automatic summary check before completing the response', async () => {
    let releaseAutoSummary: (() => void) | undefined
    mockedMaybeAutoSummarize.mockReturnValue(
      new Promise((resolve) => {
        releaseAutoSummary = resolve
      }),
    )
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Salut']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    const response = await POST(request)
    const events = await readAllEvents(response)

    // the stream already completed even though maybeAutoSummarize's promise
    // is still pending — proves the call is unawaited
    expect(events).toEqual([
      { type: 'chunk', text: 'Salut' },
      { type: 'done' },
    ])

    releaseAutoSummary?.()
  })

  it('prepends the writer prompt as a system message when one is set', async () => {
    mockedGetWriterPrompt.mockReturnValue('Tu es un auteur de roman policier.')
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Salut']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    await POST(request)

    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      [
        { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
        { role: 'system', content: buildStoryWordLimitMessage(100) },
        { role: 'system', content: 'Tu es un auteur de roman policier.' },
        ...messages,
      ],
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
    // the persisted history itself is unaffected by the writer prompt
    expect(mockedReplaceMessages).toHaveBeenCalledWith(STORY_ID, messages)
  })

  it('does not add a writer-prompt system message when no writer prompt is set', async () => {
    mockedGetWriterPrompt.mockReturnValue('')
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Salut']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    await POST(request)

    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      [
        { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
        { role: 'system', content: buildStoryWordLimitMessage(100) },
        ...messages,
      ],
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
  })

  it('prepends a characters system message built from the current character list', async () => {
    const characters = [
      { id: 'a', name: 'Alice', description: 'Une exploratrice', createdAt: 1, updatedAt: 1 },
    ]
    mockedGetAllCharacters.mockReturnValue(characters)
    mockedBuildCharactersSystemMessage.mockReturnValue('Voici la liste des personnages...')
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Salut']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    await POST(request)

    expect(mockedBuildCharactersSystemMessage).toHaveBeenCalledWith(characters)
    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      [
        { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
        { role: 'system', content: buildStoryWordLimitMessage(100) },
        { role: 'system', content: 'Voici la liste des personnages...' },
        ...messages,
      ],
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
    // the persisted history itself is unaffected by the injected characters
    expect(mockedReplaceMessages).toHaveBeenCalledWith(STORY_ID, messages)
  })

  it('does not add a characters system message when there are no characters', async () => {
    mockedGetAllCharacters.mockReturnValue([])
    mockedBuildCharactersSystemMessage.mockReturnValue(null)
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Salut']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    await POST(request)

    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      [
        { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
        { role: 'system', content: buildStoryWordLimitMessage(100) },
        ...messages,
      ],
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
  })

  it('combines the writer prompt and the characters system message, in that order', async () => {
    mockedGetWriterPrompt.mockReturnValue('Tu es un auteur de roman policier.')
    mockedBuildCharactersSystemMessage.mockReturnValue('Voici la liste des personnages...')
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Salut']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    await POST(request)

    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      [
        { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
        { role: 'system', content: buildStoryWordLimitMessage(100) },
        { role: 'system', content: 'Tu es un auteur de roman policier.' },
        { role: 'system', content: 'Voici la liste des personnages...' },
        ...messages,
      ],
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
  })

  it('calls getCurrentPromptMessages with the base system messages and full history', async () => {
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Salut']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    await POST(request)

    expect(mockedGetCurrentPromptMessages).toHaveBeenCalledWith(
      STORY_ID,
      [
        { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
        { role: 'system', content: buildStoryWordLimitMessage(100) },
      ],
      messages,
    )
  })

  it('sends the prompt returned by getCurrentPromptMessages to streamLlmReply', async () => {
    const summarizedSystem = [{ role: 'system', content: "Résumé de l'histoire jusqu'ici." }]
    const summarizedMessages = [{ id: '2', role: 'user' as const, content: 'Dernier message.', timestamp: 5000 }]
    mockedGetCurrentPromptMessages.mockReturnValue({ systemMessages: summarizedSystem, promptMessages: summarizedMessages })
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Salut']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    await POST(request)

    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      [...summarizedSystem, ...summarizedMessages],
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
  })

  it('returns 400 when messages is missing', async () => {
    const request = makeRequest({})

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedReplaceMessages).not.toHaveBeenCalled()
  })

  it('returns 400 when storyId is missing', async () => {
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages }, null)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedReplaceMessages).not.toHaveBeenCalled()
  })

  it('returns 404 when storyId does not refer to an existing story', async () => {
    mockedStoryExists.mockReturnValueOnce(false)
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages }, 'missing-story')

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'story not found' })
    expect(mockedReplaceMessages).not.toHaveBeenCalled()
  })

  it('returns 400 when messages is not an array', async () => {
    const request = makeRequest({ messages: 'not an array' })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
  })

  it('sends an error event with the underlying message when the LLM server fails before any chunk', async () => {
    // The generation is detached from this request's lifetime (see
    // app/api/chat/route.ts), so a connection failure — even one that
    // happens before any chunk — can no longer be reported as a
    // synchronous non-2xx response; it surfaces as an 'error' event on the
    // (always 200) stream, exactly like a mid-stream failure would.
    mockedStreamLlmReply.mockReturnValue(
      (async function* (): AsyncGenerator<string, void, void> {
        throw new Error('connect ECONNREFUSED')
      })(),
    )
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    const response = await POST(request)
    const events = await readAllEvents(response)

    expect(response.status).toBe(200)
    expect(events).toEqual([{ type: 'error', message: 'connect ECONNREFUSED' }])
    expect(mockedAppendMessage).not.toHaveBeenCalled()
  })

  it('logs a warning when the assistant reply contains no recognized channel tags', async () => {
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Une réponse sans balises.']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    const response = await POST(request)
    await readAllEvents(response)

    expect(logWarn).toHaveBeenCalled()
  })

  it('does not log a warning when the assistant reply uses recognized channel tags', async () => {
    mockedStreamLlmReply.mockReturnValue(fakeStream(['[CHAT]Salut ![/CHAT]']))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    const response = await POST(request)
    await readAllEvents(response)

    expect(logWarn).not.toHaveBeenCalled()
  })

  it('sends an error event with the underlying message and does not persist when the LLM fails mid-way', async () => {
    mockedStreamLlmReply.mockReturnValue(
      (async function* (): AsyncGenerator<string, void, void> {
        yield 'Salut'
        throw new Error('stream interrupted')
      })(),
    )
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    const response = await POST(request)
    const events = await readAllEvents(response)

    expect(response.status).toBe(200)
    expect(events).toEqual([
      { type: 'chunk', text: 'Salut' },
      { type: 'error', message: 'stream interrupted' },
    ])
    expect(mockedAppendMessage).not.toHaveBeenCalled()
  })

  it('sends an error event and does not persist when the LLM stream completes with no content', async () => {
    mockedStreamLlmReply.mockReturnValue(fakeStream([]))
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]
    const request = makeRequest({ messages })

    const response = await POST(request)
    const events = await readAllEvents(response)

    expect(response.status).toBe(200)
    expect(events).toEqual([
      { type: 'error', message: 'The model returned an empty response. Please try again.' },
    ])
    expect(mockedAppendMessage).not.toHaveBeenCalled()
  })



  it('returns 409 when a generation is already in progress', async () => {
    let releaseFirst: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    mockedStreamLlmReply.mockReturnValueOnce(
      (async function* (): AsyncGenerator<string, void, void> {
        yield 'Salut'
        await gate
      })(),
    )
    const messages = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]

    const firstResponse = await POST(makeRequest({ messages }))
    // let the first generation publish its first chunk before racing the second request
    await Promise.resolve()
    await Promise.resolve()

    const secondResponse = await POST(makeRequest({ messages }))
    expect(secondResponse.status).toBe(409)

    releaseFirst?.()
    await readAllEvents(firstResponse)
  })
})
