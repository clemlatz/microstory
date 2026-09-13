import type { SearchResult } from './types'

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Search request failed with status ${response.status}`
}

export async function searchKnowledgeBase(storyId: string, query: string): Promise<SearchResult[]> {
  const response = await fetch(
    `/api/search?storyId=${encodeURIComponent(storyId)}&q=${encodeURIComponent(query)}`,
  )

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.results as SearchResult[]
}
