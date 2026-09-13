import { describe, it, expect, vi } from 'vitest'

vi.mock('./charactersRepository', () => ({ searchCharacters: vi.fn() }))
vi.mock('./notesRepository', () => ({ searchNotes: vi.fn() }))
vi.mock('./documentationRepository', () => ({ searchDocumentationEntries: vi.fn() }))

import { searchKnowledgeBase } from './searchRepository'
import { searchCharacters } from './charactersRepository'
import { searchNotes } from './notesRepository'
import { searchDocumentationEntries } from './documentationRepository'

const mockedSearchCharacters = vi.mocked(searchCharacters)
const mockedSearchNotes = vi.mocked(searchNotes)
const mockedSearchDocumentationEntries = vi.mocked(searchDocumentationEntries)

const storyId = 'story-1'

describe('searchKnowledgeBase', () => {
  it('maps matching characters, notes and documentation entries into SearchResults', () => {
    mockedSearchCharacters.mockReturnValue([
      { id: 'c1', name: 'Alice', description: 'Une héroïne curieuse', createdAt: 1, updatedAt: 1 },
    ])
    mockedSearchNotes.mockReturnValue([
      { id: 'n1', title: 'Règle du monde', content: 'La magie coûte cher', createdAt: 1, updatedAt: 1 },
    ])
    mockedSearchDocumentationEntries.mockReturnValue([
      { id: 'd1', title: 'Gravité', content: 'Un sixième', url: null, createdAt: 1, updatedAt: 1 },
    ])

    const results = searchKnowledgeBase('query', storyId)

    expect(results).toEqual([
      { type: 'character', id: 'c1', title: 'Alice', snippet: 'Une héroïne curieuse' },
      { type: 'note', id: 'n1', title: 'Règle du monde', snippet: 'La magie coûte cher' },
      { type: 'documentation', id: 'd1', title: 'Gravité', snippet: 'Un sixième' },
    ])
    expect(mockedSearchCharacters).toHaveBeenCalledWith('query', storyId)
    expect(mockedSearchNotes).toHaveBeenCalledWith('query', storyId)
    expect(mockedSearchDocumentationEntries).toHaveBeenCalledWith('query', storyId)
  })

  it('returns an empty array when nothing matches in any repository', () => {
    mockedSearchCharacters.mockReturnValue([])
    mockedSearchNotes.mockReturnValue([])
    mockedSearchDocumentationEntries.mockReturnValue([])

    expect(searchKnowledgeBase('dragon', storyId)).toEqual([])
  })
})
