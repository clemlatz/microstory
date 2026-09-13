import { NextResponse } from 'next/server'
import { updateDocumentationEntry, deleteDocumentationEntry } from '@/lib/documentationRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const { id } = await context.params
  const body = await request.json()

  if (!isNonEmptyString(body?.title) || !isNonEmptyString(body?.content)) {
    return NextResponse.json(
      { error: 'title and content are required non-empty strings' },
      { status: 400 },
    )
  }

  if (body?.url !== undefined && typeof body.url !== 'string') {
    return NextResponse.json({ error: 'url must be a string' }, { status: 400 })
  }

  const trimmedUrl = typeof body?.url === 'string' ? body.url.trim() : ''

  const entry = updateDocumentationEntry(id, storyIdResult.storyId, {
    title: body.title.trim(),
    content: body.content.trim(),
    url: trimmedUrl || null,
  })

  if (!entry) {
    return NextResponse.json({ error: 'documentation entry not found' }, { status: 404 })
  }

  return NextResponse.json({ entry })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const { id } = await context.params
  deleteDocumentationEntry(id, storyIdResult.storyId)
  return NextResponse.json({ success: true })
}
