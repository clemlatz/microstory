export type Character = {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

export type Story = {
  id: string
  title: string
  presentation: string
  createdAt: number
  updatedAt: number
}

/**
 * A free-form note attached to a story (issue #78): unlike Character, it has
 * no structured "description" field, just a title and free-text content —
 * for ideas, worldbuilding rules, history, or anything that doesn't fit an
 * existing entity type. Reference-only: never sent to the LLM as context.
 */
export type Note = {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

/**
 * A piece of factual reference material attached to a story (issue #11):
 * unlike Note (free-form personal ideas), Documentation is meant to keep
 * research/sources findable so the story world stays credible — an
 * archive/write-target, never auto-injected into any prompt. `url`
 * optionally links back to the external source it was found in.
 */
export type DocumentationEntry = {
  id: string
  title: string
  content: string
  url: string | null
  createdAt: number
  updatedAt: number
}

/**
 * One match from a knowledge-base search (issue #12), across Character,
 * Note and Documentation. `snippet` is the matched entry's secondary text
 * (description/content) so a result gives some context beyond the title.
 */
export type SearchResult = {
  type: 'character' | 'note' | 'documentation'
  id: string
  title: string
  snippet: string
}
