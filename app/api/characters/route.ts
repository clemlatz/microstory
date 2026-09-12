import { NextResponse } from 'next/server'
import { getAllCharacters, createCharacter } from '@/lib/charactersRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export async function GET(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const characters = getAllCharacters(storyIdResult.storyId)

  return NextResponse.json({ characters })
}

export async function POST(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const body = await request.json()

  if (!isNonEmptyString(body?.name) || !isNonEmptyString(body?.description)) {
    return NextResponse.json(
      { error: 'name and description are required non-empty strings' },
      { status: 400 },
    )
  }

  const character = createCharacter(
    { name: body.name.trim(), description: body.description.trim() },
    storyIdResult.storyId,
  )

  return NextResponse.json({ character }, { status: 201 })
}
