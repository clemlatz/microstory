import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatStreamEvent } from './chatStreamProtocol'

vi.mock('./generationState', () => ({
  getBufferedContent: vi.fn(),
  isGenerationInProgress: vi.fn(),
  subscribeToGeneration: vi.fn(),
}))

import { createGenerationEventStream } from './chatGenerationStream'
import { getBufferedContent, isGenerationInProgress, subscribeToGeneration } from './generationState'

const mockedGetBufferedContent = vi.mocked(getBufferedContent)
const mockedIsGenerationInProgress = vi.mocked(isGenerationInProgress)
const mockedSubscribeToGeneration = vi.mocked(subscribeToGeneration)

const STORY_ID = 'story-x'

describe('createGenerationEventStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetBufferedContent.mockReturnValue('')
    mockedIsGenerationInProgress.mockReturnValue(false)
    mockedSubscribeToGeneration.mockReturnValue(() => {})
  })

  it('threads storyId into isGenerationInProgress, getBufferedContent and subscribeToGeneration when includeBuffer is true', () => {
    mockedIsGenerationInProgress.mockReturnValue(true)

    // The ReadableStream's `start` callback (where all of this happens) runs
    // synchronously as part of construction, so no read is needed to trigger it.
    createGenerationEventStream({ storyId: STORY_ID, includeBuffer: true })

    expect(mockedGetBufferedContent).toHaveBeenCalledWith(STORY_ID)
    expect(mockedIsGenerationInProgress).toHaveBeenCalledWith(STORY_ID)
    expect(mockedSubscribeToGeneration).toHaveBeenCalledWith(STORY_ID, expect.any(Function))
  })

  it('threads storyId into isGenerationInProgress and subscribeToGeneration, but skips getBufferedContent, when includeBuffer is false', () => {
    mockedIsGenerationInProgress.mockReturnValue(true)

    createGenerationEventStream({ storyId: STORY_ID, includeBuffer: false })

    expect(mockedGetBufferedContent).not.toHaveBeenCalled()
    expect(mockedIsGenerationInProgress).toHaveBeenCalledWith(STORY_ID)
    expect(mockedSubscribeToGeneration).toHaveBeenCalledWith(STORY_ID, expect.any(Function))
  })

  it('does not subscribe when no generation is in progress for that storyId', () => {
    mockedIsGenerationInProgress.mockReturnValue(false)

    createGenerationEventStream({ storyId: STORY_ID, includeBuffer: true })

    expect(mockedIsGenerationInProgress).toHaveBeenCalledWith(STORY_ID)
    expect(mockedSubscribeToGeneration).not.toHaveBeenCalled()
  })

  it('forwards subscribed events, including buffered content and the done event, as encoded chunks', async () => {
    mockedGetBufferedContent.mockReturnValue('Bonjour')
    mockedIsGenerationInProgress.mockReturnValue(true)
    let emit: ((event: ChatStreamEvent) => void) | undefined
    mockedSubscribeToGeneration.mockImplementation((_storyId, listener) => {
      emit = listener
      return () => {}
    })

    const stream = createGenerationEventStream({ storyId: STORY_ID, includeBuffer: true })
    const reader = stream.getReader()
    const decoder = new TextDecoder()

    const first = await reader.read()
    expect(decoder.decode(first.value)).toContain('Bonjour')

    expect(emit).toBeDefined()
    emit!({ type: 'done' })

    const second = await reader.read()
    expect(decoder.decode(second.value)).toContain('"type":"done"')

    const third = await reader.read()
    expect(third.done).toBe(true)
  })
})
