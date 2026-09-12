import { NextResponse } from 'next/server'
import { requireExistingStoryId } from '@/lib/requestStoryId'
import { stopGeneration } from '@/lib/generationState'

/**
 * The "Stop" button's server-side counterpart: since the generation is no
 * longer tied to the HTTP request that started it (see
 * app/api/chat/route.ts), aborting the client fetch alone no longer cancels
 * it — this is the one thing allowed to actually stop it.
 */
export async function POST(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const stopped = stopGeneration(storyIdResult.storyId)
  return NextResponse.json({ stopped })
}
