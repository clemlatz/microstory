import type { Message, ConversationSummaryRecord } from './types'

export type HistoryResponse = {
  messages: Message[]
  summaries: ConversationSummaryRecord[]
  activeCutoffId: string | null
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `History request failed with status ${response.status}`
}

export async function fetchHistory(storyId: string): Promise<HistoryResponse> {
  const response = await fetch(`/api/history?storyId=${encodeURIComponent(storyId)}`)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return (await response.json()) as HistoryResponse
}
