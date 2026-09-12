import { NextResponse } from 'next/server'
import { getRepetitionPenalty, setRepetitionPenalty } from '@/lib/settingsRepository'
import { MIN_REPETITION_PENALTY, MAX_REPETITION_PENALTY } from '@/lib/repetitionPenaltyDefaults'

export async function GET(): Promise<Response> {
  return NextResponse.json({ repetitionPenalty: getRepetitionPenalty() })
}

export async function PUT(request: Request): Promise<Response> {
  const body = await request.json()

  if (
    typeof body?.repetitionPenalty !== 'number' ||
    !Number.isFinite(body.repetitionPenalty) ||
    body.repetitionPenalty < MIN_REPETITION_PENALTY ||
    body.repetitionPenalty > MAX_REPETITION_PENALTY
  ) {
    return NextResponse.json(
      {
        error: `repetitionPenalty must be a number between ${MIN_REPETITION_PENALTY} and ${MAX_REPETITION_PENALTY}`,
      },
      { status: 400 },
    )
  }

  setRepetitionPenalty(body.repetitionPenalty)

  return NextResponse.json({ repetitionPenalty: getRepetitionPenalty() })
}
