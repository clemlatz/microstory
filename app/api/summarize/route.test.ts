import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storiesRepository', () => ({
  storyExists: vi.fn(() => true),
}))
import type { ChatStreamEvent } from '@/lib/chatStreamProtocol'

vi.mock('@/lib/llmClient', () => ({
  streamLlmReply: vi.fn(),
}))

vi.mock('@/lib/settingsRepository', () => ({
  getRepetitionPenalty: vi.fn(),
  getConversationSummary: vi.fn(),
  getVerbatimWindowWords: vi.fn(),
}))

vi.mock('@/lib/messagesRepository', () => ({
  getAllMessages: vi.fn(),
}))

import { POST } from './route'
import { streamLlmReply } from '@/lib/llmClient'
import { buildConversationSummaryMessages } from '@/lib/conversationSummaryPrompt'
import { getRepetitionPenalty, getConversationSummary, getVerbatimWindowWords } from '@/lib/settingsRepository'
import { getAllMessages } from '@/lib/messagesRepository'

const mockedStreamLlmReply = vi.mocked(streamLlmReply)
const mockedGetRepetitionPenalty = vi.mocked(getRepetitionPenalty)
const mockedGetConversationSummary = vi.mocked(getConversationSummary)
const mockedGetVerbatimWindowWords = vi.mocked(getVerbatimWindowWords)
const mockedGetAllMessages = vi.mocked(getAllMessages)

function jsonRequest(): Request {
  return new Request('http://localhost/api/summarize?storyId=test-story', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

function jsonRequestWithoutStoryId(): Request {
  return new Request('http://localhost/api/summarize', {
    method: 'POST',
    body: JSON.stringify({}),
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

describe('POST /api/summarize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetRepetitionPenalty.mockReturnValue(1.1)
    mockedGetConversationSummary.mockReturnValue({ summary: '', cutoffId: null })
    mockedGetVerbatimWindowWords.mockReturnValue(0)
    mockedGetAllMessages.mockReturnValue([
      { id: 'msg-1', role: 'user', content: 'Bonjour', timestamp: 1 },
      { id: 'msg-2', role: 'assistant', content: '[TEXTE]Un long passage de fiction...[/TEXTE]', timestamp: 2 },
    ])
  })

  it('streams the summary chunks produced by the LLM, on the first call (no cutoff yet), for everything except the trailing message kept in the verbatim window', async () => {
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Un bref', ' résumé.']))

    const response = await POST(jsonRequest())
    const events = await readAllEvents(response)

    expect(response.status).toBe(200)
    expect(events).toEqual([
      { type: 'chunk', text: 'Un bref' },
      { type: 'chunk', text: ' résumé.' },
    ])
    // With verbatimWindowWords mocked to 0, splitByWordCount still always
    // keeps the trailing message (msg-2, the assistant passage) in the
    // window — selectMessagesToFold excludes it, so only msg-1 is folded.
    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      buildConversationSummaryMessages('', [{ role: 'user', content: 'Bonjour' }]),
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
  })

  it('excludes messages that still fit within a wider verbatim window from what gets summarized', async () => {
    mockedGetVerbatimWindowWords.mockReturnValue(3) // 3 words: only the very last message fits
    mockedGetAllMessages.mockReturnValue([
      { id: 'msg-1', role: 'user', content: 'Premier message ici', timestamp: 1 },
      { id: 'msg-2', role: 'user', content: 'Dernier message', timestamp: 2 },
    ])
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Résumé.']))

    await POST(jsonRequest())

    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      buildConversationSummaryMessages('', [{ role: 'user', content: 'Premier message ici' }]),
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
  })

  it('returns 400 when everything pending already fits within the verbatim window', async () => {
    mockedGetVerbatimWindowWords.mockReturnValue(1000)
    mockedGetAllMessages.mockReturnValue([{ id: 'msg-1', role: 'user', content: 'Bonjour', timestamp: 1 }])

    const response = await POST(jsonRequest())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
    expect(mockedStreamLlmReply).not.toHaveBeenCalled()
  })

  it('interleaves user prompts and generated passages in chronological order, even when a prompt carries an intention never reformulated in the generated text (issue #59)', async () => {
    mockedGetAllMessages.mockReturnValue([
      {
        id: 'msg-1',
        role: 'user',
        content: 'Fais que le personnage principal découvre un secret sur son père',
        timestamp: 1,
      },
      { id: 'msg-2', role: 'assistant', content: '[CHAT]Bien sûr ![/CHAT][TEXTE]Il ouvrit la lettre.[/TEXTE]', timestamp: 2 },
      { id: 'msg-3', role: 'user', content: 'Continue', timestamp: 3 },
      { id: 'msg-4', role: 'assistant', content: '[TEXTE]La suite.[/TEXTE]', timestamp: 4 },
    ])
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Résumé.']))

    await POST(jsonRequest())

    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      buildConversationSummaryMessages('', [
        { role: 'user', content: 'Fais que le personnage principal découvre un secret sur son père' },
        { role: 'assistant', content: 'Il ouvrit la lettre.' },
        { role: 'user', content: 'Continue' },
      ]),
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
  })

  it('carries the persisted summary as previousSummary and only sends passages after its cutoff (issue #58)', async () => {
    mockedGetConversationSummary.mockReturnValue({ summary: 'Résumé existant.', cutoffId: 'msg-2' })
    mockedGetAllMessages.mockReturnValue([
      { id: 'msg-1', role: 'user', content: 'Bonjour', timestamp: 1 },
      { id: 'msg-2', role: 'assistant', content: '[TEXTE]Ancien passage.[/TEXTE]', timestamp: 2 },
      { id: 'msg-3', role: 'user', content: 'Continue', timestamp: 3 },
      { id: 'msg-4', role: 'assistant', content: '[TEXTE]Nouveau passage.[/TEXTE]', timestamp: 4 },
    ])
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Résumé mis à jour.']))

    await POST(jsonRequest())

    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      buildConversationSummaryMessages('Résumé existant.', [{ role: 'user', content: 'Continue' }]),
      expect.any(AbortSignal),
      { repetitionPenalty: 1.1 },
    )
  })

  it('returns a 400 when there are no new passages to summarize since the last cutoff', async () => {
    mockedGetConversationSummary.mockReturnValue({ summary: 'Résumé existant.', cutoffId: 'msg-2' })

    const response = await POST(jsonRequest())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
    expect(mockedStreamLlmReply).not.toHaveBeenCalled()
  })


  it('returns a non-2xx JSON error with the underlying message when the LLM server fails before any chunk', async () => {
    mockedStreamLlmReply.mockReturnValue(
      (async function* (): AsyncGenerator<string, void, void> {
        throw new Error('connect ECONNREFUSED')
      })(),
    )

    const response = await POST(jsonRequest())
    const data = await response.json()

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(data.error).toBe('connect ECONNREFUSED')
  })

  it('sends an error event with the underlying message when the LLM fails mid-way', async () => {
    mockedStreamLlmReply.mockReturnValue(
      (async function* (): AsyncGenerator<string, void, void> {
        yield 'Un bref'
        throw new Error('stream interrupted')
      })(),
    )

    const response = await POST(jsonRequest())
    const events = await readAllEvents(response)

    expect(response.status).toBe(200)
    expect(events).toEqual([
      { type: 'chunk', text: 'Un bref' },
      { type: 'error', message: 'stream interrupted' },
    ])
  })

  it('returns 400 when storyId is missing', async () => {
    const response = await POST(jsonRequestWithoutStoryId())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeTypeOf('string')
    expect(mockedStreamLlmReply).not.toHaveBeenCalled()
  })
})
