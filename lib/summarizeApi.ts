import type { ChatStreamEvent } from './chatStreamProtocol'

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Summarize request failed with status ${response.status}`
}

/**
 * Streams an updated "Résumer" summary. The server (app/api/summarize/route.ts)
 * derives what to summarize itself — the currently persisted summary as a
 * starting point, and only the story passages written since its cutoff — so
 * this no longer takes the full manuscript text as an argument (issue #58).
 */
export async function fetchSummary(
  storyId: string,
  onChunk: (text: string) => void,
): Promise<string> {
  const response = await fetch(`/api/summarize?storyId=${encodeURIComponent(storyId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  if (!response.body) {
    throw new Error(`Summarize request failed with status ${response.status}`)
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
