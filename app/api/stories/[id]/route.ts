import { NextResponse } from 'next/server'
import { renameStory, deleteStory } from '@/lib/storiesRepository'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params
  const body = await request.json()
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title) {
    return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 })
  }

  const story = renameStory(id, title)
  if (!story) {
    return NextResponse.json({ error: 'story not found' }, { status: 404 })
  }

  return NextResponse.json({ story })
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params
  deleteStory(id)
  return NextResponse.json({ success: true })
}
