
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Auto-summary threshold request failed with status ${response.status}`
}

export async function fetchAutoSummaryThresholdWords(): Promise<number> {
  const response = await fetch('/api/auto-summary-threshold')

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.autoSummaryThresholdWords as number
}

export async function updateAutoSummaryThresholdWords(autoSummaryThresholdWords: number): Promise<number> {
  const response = await fetch('/api/auto-summary-threshold', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ autoSummaryThresholdWords }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.autoSummaryThresholdWords as number
}
