import { searchCharacters } from './charactersRepository'
import { foldText } from './foldText'
import { searchNotes } from './notesRepository'
import { searchDocumentationEntries } from './documentationRepository'
import type { SearchResult } from './types'

const SNIPPET_LENGTH = 200
const SNIPPET_LEAD = 60

function countOccurrences(haystack: string, needle: string): number {
  let count = 0
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) count++
  return count
}

/**
 * Relevance tiers, best first: title equal to the query (0), title starting
 * with it (1), title containing it (2), found only in the text (3).
 */
function titleTier(title: string, query: string): number {
  const folded = foldText(title)
  if (folded === query) return 0
  if (folded.startsWith(query)) return 1
  if (folded.includes(query)) return 2
  return 3
}

/** The start of `content`, or — when it is long — the stretch around the first match of `query`. */
function buildSnippet(content: string, query: string): string {
  if (content.length <= SNIPPET_LENGTH) return content
  const index = foldText(content).indexOf(query)
  if (index <= SNIPPET_LEAD) return content
  const start = index - SNIPPET_LEAD
  return `…${content.slice(start, start + SNIPPET_LENGTH)}`
}

type Ranked = { result: SearchResult; tier: number; occurrences: number }

/**
 * Aggregates a single query across the story's knowledge base (issue #12):
 * Character, Note and Documentation. Each repository owns its own
 * case-insensitive substring search; this maps their results into a common
 * shape and ranks them by relevance in one mixed list: by title tier (see
 * `titleTier`), then — for text-only matches — by how often the query occurs
 * in the text, then alphabetically by title. Each snippet shows the passage
 * around the first match in the text.
 */
export function searchKnowledgeBase(query: string, storyId: string): SearchResult[] {
  const folded = foldText(query.trim())
  const rank = (type: SearchResult['type'], id: string, title: string, content: string): Ranked => ({
    result: { type, id, title, snippet: buildSnippet(content, folded) },
    tier: titleTier(title, folded),
    occurrences: countOccurrences(foldText(content), folded),
  })

  const ranked: Ranked[] = [
    ...searchCharacters(query, storyId).map((c) => rank('character', c.id, c.name, c.description)),
    ...searchNotes(query, storyId).map((n) => rank('note', n.id, n.title, n.content)),
    ...searchDocumentationEntries(query, storyId).map((d) => rank('documentation', d.id, d.title, d.content)),
  ]

  return ranked
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        (a.tier === 3 ? b.occurrences - a.occurrences : 0) ||
        a.result.title.localeCompare(b.result.title),
    )
    .map((r) => r.result)
}
