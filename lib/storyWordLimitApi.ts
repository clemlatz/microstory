
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Story word limit request failed with status ${response.status}`
}

export async function fetchMaxStoryWords(): Promise<number> {
  const response = await fetch('/api/story-word-limit')

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.maxStoryWords as number
}

export async function updateMaxStoryWords(maxStoryWords: number): Promise<number> {
  const response = await fetch('/api/story-word-limit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxStoryWords }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.maxStoryWords as number
}
