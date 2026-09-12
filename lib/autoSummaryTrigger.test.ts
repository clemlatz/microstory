import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/settingsRepository', () => ({
  getConversationSummary: vi.fn(),
  getVerbatimWindowWords: vi.fn(),
  getAutoSummaryThresholdWords: vi.fn(),
  getRepetitionPenalty: vi.fn(),
  setConversationSummary: vi.fn(),
}))

vi.mock('@/lib/messagesRepository', () => ({
  getAllMessages: vi.fn(),
}))

vi.mock('@/lib/conversationSummariesRepository', () => ({
  addConversationSummary: vi.fn(),
}))

vi.mock('@/lib/llmClient', () => ({
  streamLlmReply: vi.fn(),
}))

import { maybeAutoSummarize } from './autoSummaryTrigger'
import {
  getConversationSummary,
  getVerbatimWindowWords,
  getAutoSummaryThresholdWords,
  getRepetitionPenalty,
  setConversationSummary,
} from './settingsRepository'
import { getAllMessages } from './messagesRepository'
import { addConversationSummary } from './conversationSummariesRepository'
import { streamLlmReply } from './llmClient'
import { buildConversationSummaryMessages } from './conversationSummaryPrompt'

const mockedGetConversationSummary = vi.mocked(getConversationSummary)
const mockedGetVerbatimWindowWords = vi.mocked(getVerbatimWindowWords)
const mockedGetAutoSummaryThresholdWords = vi.mocked(getAutoSummaryThresholdWords)
const mockedGetRepetitionPenalty = vi.mocked(getRepetitionPenalty)
const mockedSetConversationSummary = vi.mocked(setConversationSummary)
const mockedGetAllMessages = vi.mocked(getAllMessages)
const mockedAddConversationSummary = vi.mocked(addConversationSummary)
const mockedStreamLlmReply = vi.mocked(streamLlmReply)
const STORY_ID = 'story-1'

function makeMessage(id: string, content: string, timestamp: number) {
  return { id, role: 'user' as const, content, timestamp }
}

function wordsMessage(id: string, wordCount: number, timestamp: number) {
  return makeMessage(id, Array.from({ length: wordCount }, (_, i) => `w${i}`).join(' '), timestamp)
}

async function* fakeStream(chunks: string[]): AsyncGenerator<string, void, void> {
  for (const chunk of chunks) yield chunk
}

describe('maybeAutoSummarize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetConversationSummary.mockReturnValue({ summary: '', cutoffId: null })
    mockedGetVerbatimWindowWords.mockReturnValue(10)
    mockedGetAutoSummaryThresholdWords.mockReturnValue(20)
    mockedGetRepetitionPenalty.mockReturnValue(1.1)
  })

  it('does nothing when the pending word count is below the threshold', async () => {
    mockedGetAllMessages.mockReturnValue([wordsMessage('1', 5, 1)])

    await maybeAutoSummarize(STORY_ID)

    expect(mockedStreamLlmReply).not.toHaveBeenCalled()
    expect(mockedSetConversationSummary).not.toHaveBeenCalled()
  })

  it('does nothing when the threshold is reached but everything still fits the verbatim window', async () => {
    // pending totals 25 words (over the 20-word threshold), but the window is 10 and
    // splitByWordCount always keeps at least the last message — here the last message
    // alone is 25 words, so nothing falls outside the window
    mockedGetAllMessages.mockReturnValue([wordsMessage('1', 25, 1)])

    await maybeAutoSummarize(STORY_ID)

    expect(mockedStreamLlmReply).not.toHaveBeenCalled()
    expect(mockedSetConversationSummary).not.toHaveBeenCalled()
  })

  it('folds the messages outside the window into the summary once the threshold is crossed', async () => {
    mockedGetAllMessages.mockReturnValue([
      wordsMessage('1', 15, 1), // falls outside the 10-word window
      wordsMessage('2', 8, 2), // kept (fits within the 10-word window)
    ])
    mockedStreamLlmReply.mockReturnValue(fakeStream(['Résumé', ' auto.']))

    await maybeAutoSummarize(STORY_ID)

    const foldedContent = Array.from({ length: 15 }, (_, i) => `w${i}`).join(' ')
    expect(mockedStreamLlmReply).toHaveBeenCalledWith(
      buildConversationSummaryMessages('', [{ role: 'user', content: foldedContent }]),
      undefined,
      { repetitionPenalty: 1.1 },
    )
    expect(mockedSetConversationSummary).toHaveBeenCalledWith(STORY_ID, 'Résumé auto.', '1')
    expect(mockedAddConversationSummary).toHaveBeenCalledWith('Résumé auto.', '1', 'auto', STORY_ID)
  })

  it('does not persist anything when the LLM reply is empty', async () => {
    mockedGetAllMessages.mockReturnValue([wordsMessage('1', 15, 1), wordsMessage('2', 8, 2)])
    mockedStreamLlmReply.mockReturnValue(fakeStream([]))

    await maybeAutoSummarize(STORY_ID)

    expect(mockedSetConversationSummary).not.toHaveBeenCalled()
    expect(mockedAddConversationSummary).not.toHaveBeenCalled()
  })

  it('catches and swallows an LLM error instead of throwing', async () => {
    mockedGetAllMessages.mockReturnValue([wordsMessage('1', 15, 1), wordsMessage('2', 8, 2)])
    mockedStreamLlmReply.mockReturnValue(
      (async function* (): AsyncGenerator<string, void, void> {
        throw new Error('connect ECONNREFUSED')
      })(),
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(maybeAutoSummarize(STORY_ID)).resolves.toBeUndefined()

    expect(mockedSetConversationSummary).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('skips a concurrent call while one is already in flight', async () => {
    mockedGetAllMessages.mockReturnValue([wordsMessage('1', 15, 1), wordsMessage('2', 8, 2)])
    let releaseFirst: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    mockedStreamLlmReply.mockReturnValueOnce(
      (async function* (): AsyncGenerator<string, void, void> {
        await gate
        yield 'Résumé.'
      })(),
    )

    const first = maybeAutoSummarize(STORY_ID)
    await Promise.resolve()
    await maybeAutoSummarize(STORY_ID) // should return immediately, no second streamLlmReply call yet

    expect(mockedStreamLlmReply).toHaveBeenCalledTimes(1)

    releaseFirst?.()
    await first
  })

  it('allows a concurrent call for a different story to proceed while one story is in flight', async () => {
    mockedGetAllMessages.mockReturnValue([wordsMessage('1', 15, 1), wordsMessage('2', 8, 2)])
    let releaseFirst: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    mockedStreamLlmReply.mockReturnValueOnce(
      (async function* (): AsyncGenerator<string, void, void> {
        await gate
        yield 'Résumé A.'
      })(),
    )
    mockedStreamLlmReply.mockReturnValueOnce(fakeStream(['Résumé B.']))

    const first = maybeAutoSummarize('story-A')
    await Promise.resolve()

    // story-A's lock is held (its streamLlmReply call is gated open), but story-B
    // should not be blocked by it: its own streamLlmReply call should proceed and
    // resolve normally, proving the lock is per-story rather than global.
    await maybeAutoSummarize('story-B')

    expect(mockedStreamLlmReply).toHaveBeenCalledTimes(2)
    expect(mockedSetConversationSummary).toHaveBeenCalledWith('story-B', 'Résumé B.', '1')
    expect(mockedAddConversationSummary).toHaveBeenCalledWith('Résumé B.', '1', 'auto', 'story-B')

    // story-A hasn't persisted yet since its stream is still gated
    expect(mockedSetConversationSummary).not.toHaveBeenCalledWith('story-A', expect.anything(), expect.anything())

    releaseFirst?.()
    await first

    expect(mockedSetConversationSummary).toHaveBeenCalledWith('story-A', 'Résumé A.', '1')
  })
})
