
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Conversation summary request failed with status ${response.status}`
}

export type ActiveConversationSummary = { summary: string; cutoffId: string | null }

/**
 * Reads the current compaction summary and its cutoff message id (issue
 * #47) — used by ChatWindow to detect when that summary has become more
 * recent than the manuscript's last passage.
 */
export async function fetchActiveConversationSummary(
  storyId: string,
): Promise<ActiveConversationSummary> {
  const response = await fetch(
    `/api/conversation-summary?storyId=${encodeURIComponent(storyId)}`,
  )

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return (await response.json()) as ActiveConversationSummary
}

/**
 * Persists `summary` as the current compaction summary (see
 * app/api/conversation-summary/route.ts) — used by ChatWindow's "Utiliser
 * comme contexte" action on a manually generated summary (issue #30).
 */
export async function persistConversationSummary(storyId: string, summary: string): Promise<void> {
  const response = await fetch(
    `/api/conversation-summary?storyId=${encodeURIComponent(storyId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary }),
    },
  )

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }
}
