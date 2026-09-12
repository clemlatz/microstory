import { describe, it, expect } from 'vitest'
import { splitByWordCount, countWords } from './verbatimWindow'
import type { Message } from './types'

function makeMessage(id: string, words: number): Message {
  return {
    id,
    role: 'assistant',
    content: Array.from({ length: words }, (_, i) => `w${i}`).join(' '),
    timestamp: Number(id),
  }
}

describe('splitByWordCount', () => {
  it('returns an empty array for an empty message list', () => {
    expect(splitByWordCount([], 100)).toEqual([])
  })

  it('includes the last message in full even when it alone exceeds the budget', () => {
    const messages = [makeMessage('1', 500)]
    expect(splitByWordCount(messages, 10)).toEqual(messages)
  })

  it('includes all messages when their total fits within the budget', () => {
    const messages = [makeMessage('1', 10), makeMessage('2', 10), makeMessage('3', 10)]
    expect(splitByWordCount(messages, 100)).toEqual(messages)
  })

  it('excludes a message that would push the total over the budget, keeping later ones', () => {
    const messages = [makeMessage('1', 50), makeMessage('2', 20), makeMessage('3', 20)]
    // last two total 40 words, fits in 45; adding the first (50 more) would exceed it
    expect(splitByWordCount(messages, 45)).toEqual([messages[1], messages[2]])
  })

  it('preserves chronological order in the result', () => {
    const messages = [makeMessage('1', 5), makeMessage('2', 5), makeMessage('3', 5)]
    const result = splitByWordCount(messages, 100)
    expect(result.map((m) => m.id)).toEqual(['1', '2', '3'])
  })

  it('still includes the last message when maxWords is zero or negative', () => {
    const messages = [makeMessage('1', 5), makeMessage('2', 5)]
    expect(splitByWordCount(messages, 0)).toEqual([messages[1]])
    expect(splitByWordCount(messages, -10)).toEqual([messages[1]])
  })

  it('counts a whitespace-only message as zero words', () => {
    const messages = [makeMessage('1', 10), { id: '2', role: 'user' as const, content: '   ', timestamp: 2 }]
    // message 2 costs 0 words, so it and message 1 (10 words) both fit in a budget of 10
    expect(splitByWordCount(messages, 10)).toEqual(messages)
  })
})

describe('countWords', () => {
  it('counts words separated by whitespace', () => {
    expect(countWords('un deux trois')).toBe(3)
  })

  it('returns 0 for empty or whitespace-only content', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
  })
})
