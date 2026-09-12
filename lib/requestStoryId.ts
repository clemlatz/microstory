import { NextResponse } from 'next/server'
import { storyExists } from './storiesRepository'

export function requireStoryId(request: Request): { storyId: string } | { error: Response } {
  const storyId = new URL(request.url).searchParams.get('storyId')
  if (!storyId) {
    return { error: NextResponse.json({ error: 'storyId is required' }, { status: 400 }) }
  }
  return { storyId }
}

/**
 * Like requireStoryId, but also verifies the storyId refers to an existing
 * story row — a request carrying a deleted-or-bogus storyId would otherwise
 * silently succeed and write orphaned data (see final review finding #5).
 */
export function requireExistingStoryId(request: Request): { storyId: string } | { error: Response } {
  const result = requireStoryId(request)
  if ('error' in result) return result

  if (!storyExists(result.storyId)) {
    return { error: NextResponse.json({ error: 'story not found' }, { status: 404 }) }
  }

  return result
}
