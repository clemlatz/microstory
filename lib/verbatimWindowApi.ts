
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Verbatim window request failed with status ${response.status}`
}

export async function fetchVerbatimWindowWords(): Promise<number> {
  const response = await fetch('/api/verbatim-window')

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.verbatimWindowWords as number
}

export async function updateVerbatimWindowWords(verbatimWindowWords: number): Promise<number> {
  const response = await fetch('/api/verbatim-window', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verbatimWindowWords }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.verbatimWindowWords as number
}
