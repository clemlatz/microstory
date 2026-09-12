
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Repetition penalty request failed with status ${response.status}`
}

export async function fetchRepetitionPenalty(): Promise<number> {
  const response = await fetch('/api/repetition-penalty')

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.repetitionPenalty as number
}

export async function updateRepetitionPenalty(repetitionPenalty: number): Promise<number> {
  const response = await fetch('/api/repetition-penalty', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repetitionPenalty }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.repetitionPenalty as number
}
