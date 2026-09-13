import { searchCharacters } from './charactersRepository'
import { searchNotes } from './notesRepository'
import { searchDocumentationEntries } from './documentationRepository'
import type { SearchResult } from './types'

/**
 * Aggregates a single query across the story's knowledge base (issue #12):
 * Character, Note and Documentation. Each repository owns its own
 * case-insensitive substring search; this just maps their results into a
 * common shape so the UI can render one grouped list.
 */
export function searchKnowledgeBase(query: string, storyId: string): SearchResult[] {
  const characters = searchCharacters(query, storyId).map(
    (character): SearchResult => ({
      type: 'character',
      id: character.id,
      title: character.name,
      snippet: character.description,
    }),
  )
  const notes = searchNotes(query, storyId).map(
    (note): SearchResult => ({ type: 'note', id: note.id, title: note.title, snippet: note.content }),
  )
  const documentation = searchDocumentationEntries(query, storyId).map(
    (entry): SearchResult => ({
      type: 'documentation',
      id: entry.id,
      title: entry.title,
      snippet: entry.content,
    }),
  )

  return [...characters, ...notes, ...documentation]
}
