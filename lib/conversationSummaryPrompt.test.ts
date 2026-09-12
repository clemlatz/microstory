import { describe, it, expect } from 'vitest'
import { buildConversationSummaryMessages } from './conversationSummaryPrompt'

describe('buildConversationSummaryMessages', () => {
  it('builds a system + user message pair with no previous summary', () => {
    const messages = buildConversationSummaryMessages('', [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: '[TEXTE]It was raining.[/TEXTE]' },
    ])

    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('summary')
    expect(messages[1]).toEqual({
      role: 'user',
      content: 'Exchanges to summarize:\nuser: Hello\n\nassistant: [TEXTE]It was raining.[/TEXTE]',
    })
  })

  it('includes the previous summary in the user message when one is given', () => {
    const messages = buildConversationSummaryMessages('Alice explores the forest.', [
      { role: 'user', content: 'What happens next?' },
    ])

    expect(messages[1]).toEqual({
      role: 'user',
      content:
        'Existing summary:\nAlice explores the forest.\n\nNew exchanges to integrate:\nuser: What happens next?',
    })
  })
})
