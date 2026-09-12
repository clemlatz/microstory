import { describe, it, expect } from 'vitest'
import { toSummaryEntries } from './conversationSummaryEntries'
import type { Message } from './types'

describe('toSummaryEntries', () => {
  it('maps a user message to a user entry with trimmed content', () => {
    const messages: Message[] = [{ id: '1', role: 'user', content: '  Bonjour  ', timestamp: 1 }]
    expect(toSummaryEntries(messages)).toEqual([{ role: 'user', content: 'Bonjour' }])
  })

  it('filters out an empty or whitespace-only user message', () => {
    const messages: Message[] = [{ id: '1', role: 'user', content: '   ', timestamp: 1 }]
    expect(toSummaryEntries(messages)).toEqual([])
  })

  it('maps an assistant message to just its [TEXTE] story content', () => {
    const messages: Message[] = [
      { id: '1', role: 'assistant', content: '[CHAT]Bien sûr ![/CHAT][TEXTE]Il ouvrit la lettre.[/TEXTE]', timestamp: 1 },
    ]
    expect(toSummaryEntries(messages)).toEqual([{ role: 'assistant', content: 'Il ouvrit la lettre.' }])
  })

  it('filters out an assistant message with no story content ([CHAT]-only)', () => {
    const messages: Message[] = [{ id: '1', role: 'assistant', content: '[CHAT]Bien sûr ![/CHAT]', timestamp: 1 }]
    expect(toSummaryEntries(messages)).toEqual([])
  })

  it('preserves chronological order across a mix of user and assistant messages', () => {
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'Continue', timestamp: 1 },
      { id: '2', role: 'assistant', content: '[TEXTE]La suite.[/TEXTE]', timestamp: 2 },
    ]
    expect(toSummaryEntries(messages)).toEqual([
      { role: 'user', content: 'Continue' },
      { role: 'assistant', content: 'La suite.' },
    ])
  })
})
