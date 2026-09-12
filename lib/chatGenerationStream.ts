import { encodeChatStreamEvent } from './chatStreamProtocol'
import { getBufferedContent, isGenerationInProgress, subscribeToGeneration } from './generationState'

/**
 * Builds the NDJSON response body for a generation in progress: optionally
 * replays what has already been produced (used by the resume endpoint so a
 * freshly loaded client catches up instantly), then forwards further events
 * live until the generation finishes, closing the stream on `done`/`error`.
 * If the client disconnects, `controller.enqueue` starts throwing — that's
 * caught and ignored rather than propagated, since the generation itself
 * (tracked in `lib/generationState.ts`) is unaffected by this stream closing.
 */
export function createGenerationEventStream(options: {
  storyId: string
  includeBuffer: boolean
}): ReadableStream<Uint8Array> {
  const { storyId } = options
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false

      function close() {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch {
          // already closed/disconnected
        }
      }

      if (options.includeBuffer) {
        const buffered = getBufferedContent(storyId)
        if (buffered.length > 0) {
          try {
            controller.enqueue(encodeChatStreamEvent({ type: 'chunk', text: buffered }))
          } catch {
            // client already gone; nothing left to do
          }
        }
      }

      if (!isGenerationInProgress(storyId)) {
        close()
        return
      }

      const unsubscribe = subscribeToGeneration(storyId, (event) => {
        try {
          controller.enqueue(encodeChatStreamEvent(event))
        } catch {
          // client disconnected; keep draining events so we still unsubscribe/close on completion
        }
        if (event.type === 'error' || event.type === 'done') {
          unsubscribe()
          close()
        }
      })
    },
  })
}
