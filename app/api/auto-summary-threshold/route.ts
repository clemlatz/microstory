import { NextResponse } from 'next/server'
import { getAutoSummaryThresholdWords, setAutoSummaryThresholdWords } from '@/lib/settingsRepository'

export async function GET(): Promise<Response> {
  return NextResponse.json({ autoSummaryThresholdWords: getAutoSummaryThresholdWords() })
}

export async function PUT(request: Request): Promise<Response> {
  const body = await request.json()

  if (
    typeof body?.autoSummaryThresholdWords !== 'number' ||
    !Number.isInteger(body.autoSummaryThresholdWords) ||
    body.autoSummaryThresholdWords <= 0
  ) {
    return NextResponse.json(
      { error: 'autoSummaryThresholdWords must be a positive integer' },
      { status: 400 },
    )
  }

  setAutoSummaryThresholdWords(body.autoSummaryThresholdWords)

  return NextResponse.json({ autoSummaryThresholdWords: getAutoSummaryThresholdWords() })
}
