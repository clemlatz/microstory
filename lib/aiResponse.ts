import type { ChatStreamEvent } from './chatStreamProtocol'
import type { Message } from './types'

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `AI response request failed with status ${response.status}`
}

export async function fetchAiResponse(
  storyId: string,
  messages: Message[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`/api/chat?storyId=${encodeURIComponent(storyId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  if (!response.body) {
    throw new Error(`AI response request failed with status ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line) continue
      const event = JSON.parse(line) as ChatStreamEvent
      if (event.type === 'error') {
        throw new Error(event.message)
      }
      if (event.type === 'done') continue
      fullContent += event.text
      onChunk(event.text)
    }
  }

  return fullContent
}

/**
 * Picks back up a generation that was already in progress on the server
 * when this page loaded (see app/api/chat/resume/route.ts) — this is what
 * lets a reload mid-reply recover the "En train d'écrire…" state instead of
 * silently losing it. `onResuming` fires as soon as we know a generation is
 * actually in progress (before any buffered text arrives), so the caller
 * can show the typing indicator even if the model hasn't produced its first
 * token yet.
 */
export async function resumeAiResponse(
  storyId: string,
  onResuming: () => void,
  onChunk: (text: string) => void,
): Promise<{ resumed: boolean; fullContent: string }> {
  const response = await fetch(`/api/chat/resume?storyId=${encodeURIComponent(storyId)}`)

  if (response.status === 204) {
    return { resumed: false, fullContent: '' }
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  if (!response.body) {
    throw new Error(`Resuming the AI response failed with status ${response.status}`)
  }

  onResuming()

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line) continue
      const event = JSON.parse(line) as ChatStreamEvent
      if (event.type === 'error') {
        throw new Error(event.message)
      }
      if (event.type === 'done') continue
      fullContent += event.text
      onChunk(event.text)
    }
  }

  return { resumed: true, fullContent }
}

/** The server-side counterpart of the "Stop" button — see app/api/chat/stop/route.ts. */
export async function stopGeneration(storyId: string): Promise<void> {
  const response = await fetch(`/api/chat/stop?storyId=${encodeURIComponent(storyId)}`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Stopping the generation failed with status ${response.status}`)
  }
}

export async function fetchMessages(storyId: string): Promise<Message[]> {
  const response = await fetch(`/api/messages?storyId=${encodeURIComponent(storyId)}`)

  if (!response.ok) {
    throw new Error(`Fetching messages failed with status ${response.status}`)
  }

  const data = await response.json()
  return data.messages as Message[]
}

export async function resetConversation(storyId: string): Promise<void> {
  const response = await fetch(`/api/messages?storyId=${encodeURIComponent(storyId)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Resetting the conversation failed with status ${response.status}`)
  }
}
