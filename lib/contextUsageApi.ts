export type ContextUsage = {
  usedTokens: number
  maxTokens: number | null
  pendingWords: number
  autoSummaryThresholdWords: number
  modelName: string
  modelLoaded: boolean | null
  modelIsLoading: boolean | null
}


async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Context usage request failed with status ${response.status}`
}

export async function fetchContextUsage(storyId: string): Promise<ContextUsage> {
  const response = await fetch(`/api/context-usage?storyId=${encodeURIComponent(storyId)}`)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return (await response.json()) as ContextUsage
}
