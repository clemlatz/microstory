import type { DocumentationEntry } from './types'

export type DocumentationInput = {
  title: string
  content: string
  url?: string
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Documentation request failed with status ${response.status}`
}

export async function fetchDocumentation(storyId: string): Promise<DocumentationEntry[]> {
  const response = await fetch(`/api/documentation?storyId=${encodeURIComponent(storyId)}`)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.documentation as DocumentationEntry[]
}

export async function createDocumentationEntry(
  storyId: string,
  input: DocumentationInput,
): Promise<DocumentationEntry> {
  const response = await fetch(`/api/documentation?storyId=${encodeURIComponent(storyId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.entry as DocumentationEntry
}

export async function updateDocumentationEntry(
  storyId: string,
  id: string,
  input: DocumentationInput,
): Promise<DocumentationEntry> {
  const response = await fetch(`/api/documentation/${id}?storyId=${encodeURIComponent(storyId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.entry as DocumentationEntry
}

export async function deleteDocumentationEntry(storyId: string, id: string): Promise<void> {
  const response = await fetch(`/api/documentation/${id}?storyId=${encodeURIComponent(storyId)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }
}
