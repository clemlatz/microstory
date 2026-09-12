import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Message } from './types'

const STORY_ID = 'story-1'

describe('conversationCompaction — pure helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const MESSAGES: Message[] = [
    { id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 },
    { id: '2', role: 'assistant', content: 'Salut', timestamp: 2000 },
    { id: '3', role: 'user', content: 'Et ensuite ?', timestamp: 3000 },
  ]

  it('messagesAfterCutoff returns everything when cutoffId is null', async () => {
    const { messagesAfterCutoff } = await import('./conversationCompaction')
    expect(messagesAfterCutoff(MESSAGES, null)).toEqual(MESSAGES)
  })

  it('messagesAfterCutoff returns everything when cutoffId is not found', async () => {
    const { messagesAfterCutoff } = await import('./conversationCompaction')
    expect(messagesAfterCutoff(MESSAGES, 'unknown')).toEqual(MESSAGES)
  })

  it('messagesAfterCutoff returns only the messages after the cutoff', async () => {
    const { messagesAfterCutoff } = await import('./conversationCompaction')
    expect(messagesAfterCutoff(MESSAGES, '1')).toEqual([MESSAGES[1], MESSAGES[2]])
  })

  it('getCurrentPromptMessages returns the base system messages and the full history when it fits the default word budget', async () => {
    const { getCurrentPromptMessages } = await import('./conversationCompaction')
    const baseSystemMessages = [{ role: 'system', content: 'Instructions.' }]

    const result = getCurrentPromptMessages(STORY_ID, baseSystemMessages, MESSAGES)

    expect(result).toEqual({ systemMessages: baseSystemMessages, promptMessages: MESSAGES })
  })

  it('getCurrentPromptMessages appends the stored summary while still applying the word window to promptMessages', async () => {
    const { getCurrentPromptMessages } = await import('./conversationCompaction')
    const { setConversationSummary } = await import('./settingsRepository')
    setConversationSummary(STORY_ID, 'Résumé jusque-là.', '1')
    const baseSystemMessages = [{ role: 'system', content: 'Instructions.' }]

    const result = getCurrentPromptMessages(STORY_ID, baseSystemMessages, MESSAGES)

    expect(result).toEqual({
      systemMessages: [{ role: 'system', content: 'Instructions.' }, { role: 'system', content: 'Résumé jusque-là.' }],
      promptMessages: MESSAGES,
    })
  })

  it('getCurrentPromptMessages truncates promptMessages to the configured word budget, ignoring the summary cutoff', async () => {
    const { getCurrentPromptMessages } = await import('./conversationCompaction')
    const { setVerbatimWindowWords } = await import('./settingsRepository')
    setVerbatimWindowWords(1)
    const baseSystemMessages = [{ role: 'system', content: 'Instructions.' }]

    const result = getCurrentPromptMessages(STORY_ID, baseSystemMessages, MESSAGES)

    expect(result.promptMessages).toEqual([MESSAGES[2]])
  })
})
