import type { ConversationSummaryRecord } from './types'

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Request failed with status ${response.status}`
}

/**
 * Edits a previously-recorded summary's content (issue #42), from the
 * "Historique" view. See app/api/conversation-summaries/[id]/route.ts for
 * how an edit to the currently-active summary also updates what's sent to
 * the LLM on the next turn.
 */
export async function updateConversationSummary(
  storyId: string,
  id: string,
  content: string,
): Promise<ConversationSummaryRecord> {
  const response = await fetch(
    `/api/conversation-summaries/${id}?storyId=${encodeURIComponent(storyId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    },
  )

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = (await response.json()) as { summary: ConversationSummaryRecord }
  return data.summary
}
