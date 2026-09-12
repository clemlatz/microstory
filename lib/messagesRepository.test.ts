import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Message } from './types'

const storyId = 'story-1'

const sample: Message[] = [
  { id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 },
  { id: '2', role: 'assistant', content: 'Salut !', timestamp: 2000 },
]

describe('messagesRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns an empty array when no messages exist', async () => {
    const { getAllMessages } = await import('./messagesRepository')
    expect(getAllMessages(storyId)).toEqual([])
  })

  it('replaceMessages stores the given messages, replacing prior content', async () => {
    const { getAllMessages, replaceMessages } = await import('./messagesRepository')
    replaceMessages(storyId, sample)
    expect(getAllMessages(storyId)).toEqual(sample)

    replaceMessages(storyId, [sample[0]])
    expect(getAllMessages(storyId)).toEqual([sample[0]])
  })

  it('appendMessage adds one message without removing existing ones', async () => {
    const { getAllMessages, replaceMessages, appendMessage } = await import('./messagesRepository')
    replaceMessages(storyId, [sample[0]])
    appendMessage(sample[1], storyId)
    expect(getAllMessages(storyId)).toEqual(sample)
  })

  it('clearMessages empties the table', async () => {
    const { getAllMessages, replaceMessages, clearMessages } = await import('./messagesRepository')
    replaceMessages(storyId, sample)
    clearMessages(storyId)
    expect(getAllMessages(storyId)).toEqual([])
  })

  it('getAllMessages orders results by timestamp ascending', async () => {
    const { getAllMessages, replaceMessages } = await import('./messagesRepository')
    replaceMessages(storyId, [sample[1], sample[0]])
    expect(getAllMessages(storyId)).toEqual(sample)
  })

  it('scopes messages by storyId, not returning another story\'s messages', async () => {
    const { getAllMessages, replaceMessages } = await import('./messagesRepository')
    const otherStoryMessage: Message = { id: '3', role: 'user', content: 'Autre histoire', timestamp: 3000 }
    replaceMessages(storyId, sample)
    replaceMessages('story-2', [otherStoryMessage])

    expect(getAllMessages(storyId)).toEqual(sample)
    expect(getAllMessages('story-2')).toEqual([otherStoryMessage])
  })
})
