import { describe, it, expect } from 'vitest'
import { estimateTokensFromText } from './tokenEstimate'

describe('estimateTokensFromText', () => {
  it('estimates roughly one token per 4 characters, rounded up', () => {
    expect(estimateTokensFromText('')).toBe(0)
    expect(estimateTokensFromText('abcd')).toBe(1)
    expect(estimateTokensFromText('abcde')).toBe(2)
    expect(estimateTokensFromText('x'.repeat(100))).toBe(25)
  })
})
