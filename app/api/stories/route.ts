import { NextResponse } from 'next/server'
import { getAllStories, createStory } from '@/lib/storiesRepository'

export async function GET(): Promise<Response> {
  const stories = getAllStories()

  return NextResponse.json({ stories })
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json()
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title) {
    return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 })
  }

  const story = createStory(title)
  return NextResponse.json({ story })
}
