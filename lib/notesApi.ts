import type { Note } from './types'

export type NoteInput = {
  title: string
  content: string
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Notes request failed with status ${response.status}`
}

export async function fetchNotes(storyId: string): Promise<Note[]> {
  const response = await fetch(`/api/notes?storyId=${encodeURIComponent(storyId)}`)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.notes as Note[]
}

export async function createNote(storyId: string, input: NoteInput): Promise<Note> {
  const response = await fetch(`/api/notes?storyId=${encodeURIComponent(storyId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.note as Note
}

export async function updateNote(storyId: string, id: string, input: NoteInput): Promise<Note> {
  const response = await fetch(`/api/notes/${id}?storyId=${encodeURIComponent(storyId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.note as Note
}

export async function deleteNote(storyId: string, id: string): Promise<void> {
  const response = await fetch(`/api/notes/${id}?storyId=${encodeURIComponent(storyId)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }
}
