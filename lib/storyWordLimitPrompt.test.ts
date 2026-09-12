import { describe, it, expect } from 'vitest'
import { buildStoryWordLimitMessage } from './storyWordLimitPrompt'

describe('buildStoryWordLimitMessage', () => {
  it('includes the given word count', () => {
    expect(buildStoryWordLimitMessage(100)).toContain('100')
  })

  it('scopes the instruction to the [TEXTE] channel', () => {
    const message = buildStoryWordLimitMessage(100)
    expect(message).toContain('[TEXTE]')
    expect(message).toContain('[CHAT]')
  })

  it('reflects a different word count', () => {
    expect(buildStoryWordLimitMessage(42)).toContain('42')
  })
})
