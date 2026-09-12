import { requireExistingStoryId } from '@/lib/requestStoryId'
import { isGenerationInProgress } from '@/lib/generationState'
import { createGenerationEventStream } from '@/lib/chatGenerationStream'

/**
 * Lets a freshly loaded client discover and catch up on a generation that
 * was already in progress (see lib/generationState.ts) — this is what fixes
 * a reload leaving "En train d'écrire…" showing no state: with no
 * generation running, this responds 204 immediately; with one running, it
 * replays the text produced so far and then keeps streaming live.
 */
export async function GET(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error
  const { storyId } = storyIdResult

  if (!isGenerationInProgress(storyId)) {
    return new Response(null, { status: 204 })
  }

  const stream = createGenerationEventStream({ storyId, includeBuffer: true })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
}
