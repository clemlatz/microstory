import { NextResponse } from 'next/server'
import { updateCharacter, deleteCharacter } from '@/lib/charactersRepository'
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

  if (!isNonEmptyString(body?.name) || !isNonEmptyString(body?.description)) {
    return NextResponse.json(
      { error: 'name and description are required non-empty strings' },
      { status: 400 },
    )
  }

  const character = updateCharacter(id, storyIdResult.storyId, {
    name: body.name.trim(),
    description: body.description.trim(),
  })

  if (!character) {
    return NextResponse.json({ error: 'character not found' }, { status: 404 })
  }

  return NextResponse.json({ character })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const { id } = await context.params
  deleteCharacter(id, storyIdResult.storyId)
  return NextResponse.json({ success: true })
}
