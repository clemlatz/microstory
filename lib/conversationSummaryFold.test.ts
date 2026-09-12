import { describe, it, expect } from 'vitest'
import { selectMessagesToFold } from './conversationSummaryFold'
import type { Message } from './types'

function makeMessage(id: string, words: number): Message {
  return {
    id,
    role: 'assistant',
    content: Array.from({ length: words }, (_, i) => `w${i}`).join(' '),
    timestamp: Number(id),
  }
}

describe('selectMessagesToFold', () => {
  it('returns an empty array when pending is empty', () => {
    expect(selectMessagesToFold([], 100)).toEqual([])
  })

  it('returns an empty array when everything in pending fits within the window', () => {
    const pending = [makeMessage('1', 10), makeMessage('2', 10)]
    expect(selectMessagesToFold(pending, 100)).toEqual([])
  })

  it('returns the messages that fall outside the trailing window, in chronological order', () => {
    const pending = [makeMessage('1', 50), makeMessage('2', 20), makeMessage('3', 20)]
    // window keeps the last two (40 words, fits in 45); the first (50 words) falls outside
    expect(selectMessagesToFold(pending, 45)).toEqual([pending[0]])
  })

  it('returns everything except the single most recent message when it alone exceeds the window', () => {
    const pending = [makeMessage('1', 10), makeMessage('2', 10), makeMessage('3', 500)]
    // splitByWordCount always keeps at least the last message, however large
    expect(selectMessagesToFold(pending, 5)).toEqual([pending[0], pending[1]])
  })
})
