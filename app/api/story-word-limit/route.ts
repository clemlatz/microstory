import { NextResponse } from 'next/server'
import { getMaxStoryWords, setMaxStoryWords } from '@/lib/settingsRepository'

export async function GET(): Promise<Response> {
  return NextResponse.json({ maxStoryWords: getMaxStoryWords() })
}

export async function PUT(request: Request): Promise<Response> {
  const body = await request.json()

  if (
    typeof body?.maxStoryWords !== 'number' ||
    !Number.isInteger(body.maxStoryWords) ||
    body.maxStoryWords <= 0
  ) {
    return NextResponse.json(
      { error: 'maxStoryWords must be a positive integer' },
      { status: 400 },
    )
  }

  setMaxStoryWords(body.maxStoryWords)

  return NextResponse.json({ maxStoryWords: getMaxStoryWords() })
}
