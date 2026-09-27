import { NextResponse } from 'next/server'
import { buildStoryBackupZip, slugify } from '@/lib/storyExport'
import { getStoryById } from '@/lib/storiesRepository'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params

  const story = getStoryById(id)
  if (!story) return NextResponse.json({ error: 'story not found' }, { status: 404 })

  const zip = await buildStoryBackupZip(id)
  if (!zip) return NextResponse.json({ error: 'story not found' }, { status: 404 })

  return new Response(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slugify(story.title)}-backup.zip"`,
    },
  })
}
