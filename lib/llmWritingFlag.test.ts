import { describe, it, expect, afterEach } from 'vitest'
import { isLlmWritingEnabled } from './llmWritingFlag'

describe('isLlmWritingEnabled', () => {
  const original = process.env.LLM_WRITING_ENABLED

  afterEach(() => {
    if (original === undefined) delete process.env.LLM_WRITING_ENABLED
    else process.env.LLM_WRITING_ENABLED = original
  })

  it('defaults to true when unset', () => {
    delete process.env.LLM_WRITING_ENABLED
    expect(isLlmWritingEnabled()).toBe(true)
  })

  it('is false when set to "false"', () => {
    process.env.LLM_WRITING_ENABLED = 'false'
    expect(isLlmWritingEnabled()).toBe(false)
  })

  it('is true for any other value', () => {
    process.env.LLM_WRITING_ENABLED = 'true'
    expect(isLlmWritingEnabled()).toBe(true)
  })
})
