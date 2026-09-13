import { NextResponse } from 'next/server'
import { searchKnowledgeBase } from '@/lib/searchRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

export async function GET(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ results: [] })
  }

  const results = searchKnowledgeBase(q, storyIdResult.storyId)

  return NextResponse.json({ results })
}
