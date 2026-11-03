import { NextResponse } from 'next/server'
import { getDocumentationVersions } from '@/lib/documentationRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const { id } = await context.params
  return NextResponse.json({ versions: getDocumentationVersions(id, storyIdResult.storyId) })
}
