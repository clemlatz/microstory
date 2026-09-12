import { describe, expect, it, vi } from 'vitest'
import {
  startGeneration,
  publishChunk,
  publishError,
  finishGeneration,
  isGenerationInProgress,
  getBufferedContent,
  stopGeneration,
  subscribeToGeneration,
} from './generationState'

describe('generationState', () => {
  it('isolates in-progress state between two story ids', () => {
    const signalA = startGeneration('story-a')
    expect(signalA).not.toBeNull()
    expect(isGenerationInProgress('story-a')).toBe(true)
    expect(isGenerationInProgress('story-b')).toBe(false)

    finishGeneration('story-a')
    expect(isGenerationInProgress('story-a')).toBe(false)
  })

  it('startGeneration returns null if a generation is already running for that story', () => {
    startGeneration('story-c')
    expect(startGeneration('story-c')).toBeNull()
    finishGeneration('story-c')
  })

  it("buffers chunks per story and notifies only that story's listeners", () => {
    startGeneration('story-d')
    startGeneration('story-e')

    const dListener = vi.fn()
    const eListener = vi.fn()
    subscribeToGeneration('story-d', dListener)
    subscribeToGeneration('story-e', eListener)

    publishChunk('story-d', 'hello')

    expect(getBufferedContent('story-d')).toBe('hello')
    expect(getBufferedContent('story-e')).toBe('')
    expect(dListener).toHaveBeenCalledWith({ type: 'chunk', text: 'hello' })
    expect(eListener).not.toHaveBeenCalled()

    finishGeneration('story-d')
    finishGeneration('story-e')
  })

  it('stopGeneration returns false for a story with nothing running', () => {
    expect(stopGeneration('story-f')).toBe(false)
  })

  it('stopGeneration aborts the signal and returns true when a generation is running', () => {
    const signal = startGeneration('story-g')!
    expect(stopGeneration('story-g')).toBe(true)
    expect(signal.aborted).toBe(true)
    finishGeneration('story-g')
  })

  it('publishError notifies listeners with an error event', () => {
    startGeneration('story-h')
    const listener = vi.fn()
    subscribeToGeneration('story-h', listener)

    publishError('story-h', 'boom')

    expect(listener).toHaveBeenCalledWith({ type: 'error', message: 'boom' })
    finishGeneration('story-h')
  })

  it('finishGeneration notifies listeners with done and removes the story from the map', () => {
    startGeneration('story-i')
    const listener = vi.fn()
    subscribeToGeneration('story-i', listener)

    finishGeneration('story-i')

    expect(listener).toHaveBeenCalledWith({ type: 'done' })
    expect(isGenerationInProgress('story-i')).toBe(false)
  })

  it('unsubscribe stops further notifications', () => {
    startGeneration('story-j')
    const listener = vi.fn()
    const unsubscribe = subscribeToGeneration('story-j', listener)

    publishChunk('story-j', 'a')
    unsubscribe()
    publishChunk('story-j', 'b')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ type: 'chunk', text: 'a' })
    finishGeneration('story-j')
  })

  it('subscribeToGeneration is a no-op when no generation is running for the story', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToGeneration('story-k', listener)

    expect(() => unsubscribe()).not.toThrow()
    expect(listener).not.toHaveBeenCalled()
  })

  it('publishChunk/publishError are no-ops when no generation is running for the story', () => {
    expect(() => publishChunk('story-l', 'x')).not.toThrow()
    expect(() => publishError('story-l', 'y')).not.toThrow()
    expect(getBufferedContent('story-l')).toBe('')
  })
})
