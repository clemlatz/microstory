
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Writer prompt request failed with status ${response.status}`
}

export async function fetchWriterPrompt(storyId: string): Promise<string> {
  const response = await fetch(`/api/writer-prompt?storyId=${encodeURIComponent(storyId)}`)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.writerPrompt as string
}

export async function updateWriterPrompt(storyId: string, writerPrompt: string): Promise<string> {
  const response = await fetch(`/api/writer-prompt?storyId=${encodeURIComponent(storyId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ writerPrompt }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.writerPrompt as string
}
