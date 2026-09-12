import type { Story } from './types'

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Stories request failed with status ${response.status}`
}

export async function fetchStories(): Promise<Story[]> {
  const response = await fetch('/api/stories')
  if (!response.ok) throw new Error(await extractErrorMessage(response))
  const data = await response.json()
  return data.stories as Story[]
}

export async function createStory(title: string): Promise<Story> {
  const response = await fetch('/api/stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!response.ok) throw new Error(await extractErrorMessage(response))
  const data = await response.json()
  return data.story as Story
}

export async function renameStory(id: string, title: string): Promise<Story> {
  const response = await fetch(`/api/stories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!response.ok) throw new Error(await extractErrorMessage(response))
  const data = await response.json()
  return data.story as Story
}

export async function updateStoryPresentation(id: string, presentation: string): Promise<Story> {
  const response = await fetch(`/api/stories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presentation }),
  })
  if (!response.ok) throw new Error(await extractErrorMessage(response))
  const data = await response.json()
  return data.story as Story
}

export async function deleteStory(id: string): Promise<void> {
  const response = await fetch(`/api/stories/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error(await extractErrorMessage(response))
}
