import type { Character } from './types'

export type CharacterInput = {
  name: string
  description: string
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // response body wasn't valid JSON — fall through to the generic message
  }
  return `Characters request failed with status ${response.status}`
}

export async function fetchCharacters(storyId: string): Promise<Character[]> {
  const response = await fetch(`/api/characters?storyId=${encodeURIComponent(storyId)}`)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.characters as Character[]
}

export async function createCharacter(storyId: string, input: CharacterInput): Promise<Character> {
  const response = await fetch(`/api/characters?storyId=${encodeURIComponent(storyId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.character as Character
}

export async function updateCharacter(
  storyId: string,
  id: string,
  input: CharacterInput,
): Promise<Character> {
  const response = await fetch(
    `/api/characters/${id}?storyId=${encodeURIComponent(storyId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  const data = await response.json()
  return data.character as Character
}

export async function deleteCharacter(storyId: string, id: string): Promise<void> {
  const response = await fetch(
    `/api/characters/${id}?storyId=${encodeURIComponent(storyId)}`,
    { method: 'DELETE' },
  )

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }
}
