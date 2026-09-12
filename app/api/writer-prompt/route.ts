import { NextResponse } from 'next/server'
import { getWriterPrompt, setWriterPrompt } from '@/lib/settingsRepository'
import { requireExistingStoryId } from '@/lib/requestStoryId'

export async function GET(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  return NextResponse.json({ writerPrompt: getWriterPrompt(storyIdResult.storyId) })
}

export async function PUT(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error

  const body = await request.json()

  if (typeof body?.writerPrompt !== 'string') {
    return NextResponse.json({ error: 'writerPrompt must be a string' }, { status: 400 })
  }

  setWriterPrompt(storyIdResult.storyId, body.writerPrompt.trim())

  return NextResponse.json({ writerPrompt: getWriterPrompt(storyIdResult.storyId) })
}
