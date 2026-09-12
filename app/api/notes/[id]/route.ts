import { NextResponse } from 'next/server'
import { updateNote, deleteNote } from '@/lib/notesRepository'
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

  const note = updateNote(id, storyIdResult.storyId, {
    title: body.title.trim(),
    content: body.content.trim(),
  })

  if (!note) {
    return NextResponse.json({ error: 'note not found' }, { status: 404 })
  }

  return NextResponse.json({ note })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const { id } = await context.params
  deleteNote(id, storyIdResult.storyId)
  return NextResponse.json({ success: true })
}
