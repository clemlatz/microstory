import { NextResponse } from 'next/server'
import { getAllDocumentationEntries, createDocumentationEntry } from '@/lib/documentationRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export async function GET(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const documentation = getAllDocumentationEntries(storyIdResult.storyId)

  return NextResponse.json({ documentation })
}

export async function POST(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const body = await request.json()

  if (!isNonEmptyString(body?.title)) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  if (body?.url !== undefined && typeof body.url !== 'string') {
    return NextResponse.json({ error: 'url must be a string' }, { status: 400 })
  }

  const trimmedUrl = typeof body?.url === 'string' ? body.url.trim() : ''

  const entry = createDocumentationEntry(
    {
      title: body.title.trim(),
      content: typeof body?.content === 'string' ? body.content.trim() : '',
      url: trimmedUrl || null,
    },
    storyIdResult.storyId,
  )

  return NextResponse.json({ entry }, { status: 201 })
}
