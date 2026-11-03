import { NextResponse } from 'next/server'
import { getNoteVersions } from '@/lib/notesRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const { id } = await context.params
  return NextResponse.json({ versions: getNoteVersions(id, storyIdResult.storyId) })
}
