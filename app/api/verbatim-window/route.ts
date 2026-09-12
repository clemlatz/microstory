import { NextResponse } from 'next/server'
import { getVerbatimWindowWords, setVerbatimWindowWords } from '@/lib/settingsRepository'

export async function GET(): Promise<Response> {
  return NextResponse.json({ verbatimWindowWords: getVerbatimWindowWords() })
}

export async function PUT(request: Request): Promise<Response> {
  const body = await request.json()

  if (
    typeof body?.verbatimWindowWords !== 'number' ||
    !Number.isInteger(body.verbatimWindowWords) ||
    body.verbatimWindowWords <= 0
  ) {
    return NextResponse.json(
      { error: 'verbatimWindowWords must be a positive integer' },
      { status: 400 },
    )
  }

  setVerbatimWindowWords(body.verbatimWindowWords)

  return NextResponse.json({ verbatimWindowWords: getVerbatimWindowWords() })
}
