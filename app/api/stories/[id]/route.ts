import { NextResponse } from 'next/server'
import { renameStory, updateStoryPresentation, deleteStory } from '@/lib/storiesRepository'
import type { Story } from '@/lib/types'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Updates a story's title and/or presentation (issue #1): both fields are
 * optional in the body so a caller can update either independently, but at
 * least one must be present. `title` must be non-empty (a story always has
 * one); `presentation` may be an empty string, to allow clearing it.
 */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params
  const body = await request.json()

  const hasTitle = typeof body?.title === 'string'
  const hasPresentation = typeof body?.presentation === 'string'
  if (!hasTitle && !hasPresentation) {
    return NextResponse.json({ error: 'title or presentation must be provided' }, { status: 400 })
  }
  if (hasTitle && !body.title.trim()) {
    return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 })
  }

  let story: Story | null = null
  if (hasTitle) {
    story = renameStory(id, body.title.trim())
    if (!story) return NextResponse.json({ error: 'story not found' }, { status: 404 })
  }
  if (hasPresentation) {
    story = updateStoryPresentation(id, body.presentation.trim())
    if (!story) return NextResponse.json({ error: 'story not found' }, { status: 404 })
  }

  return NextResponse.json({ story })
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params
  deleteStory(id)
  return NextResponse.json({ success: true })
}
