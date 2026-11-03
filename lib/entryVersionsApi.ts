import type { EntryVersion } from './types'
import type { RecentEntityKind } from './recentEntities'

const ENTRY_API_BASE: Record<RecentEntityKind, string> = {
  character: '/api/characters',
  note: '/api/notes',
  documentation: '/api/documentation',
}

/** Past versions of one character/note/documentation entry, most recent first. */
export async function fetchEntryVersions(
  kind: RecentEntityKind,
  storyId: string,
  entryId: string,
): Promise<EntryVersion[]> {
  const response = await fetch(
    `${ENTRY_API_BASE[kind]}/${encodeURIComponent(entryId)}/versions?storyId=${encodeURIComponent(storyId)}`,
  )

  if (!response.ok) {
    let message = `Versions request failed with status ${response.status}`
    try {
      const data = await response.json()
      if (typeof data?.error === 'string') message = data.error
    } catch {
      // response body wasn't valid JSON — keep the generic message
    }
    throw new Error(message)
  }

  const data = await response.json()
  return data.versions as EntryVersion[]
}
