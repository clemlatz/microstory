import { NextResponse } from 'next/server'
import { getAllNotes, createNote } from '@/lib/notesRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export async function GET(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const notes = getAllNotes(storyIdResult.storyId)

  return NextResponse.json({ notes })
}

export async function POST(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const body = await request.json()

  if (!isNonEmptyString(body?.title)) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const note = createNote(
    {
      title: body.title.trim(),
      content: typeof body?.content === 'string' ? body.content.trim() : '',
    },
    storyIdResult.storyId,
  )

  return NextResponse.json({ note }, { status: 201 })
}
