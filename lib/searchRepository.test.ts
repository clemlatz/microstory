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
      { type: 'documentation', id: 'd1', title: 'Gravité', snippet: 'Un sixième' },
      { type: 'note', id: 'n1', title: 'Règle du monde', snippet: 'La magie coûte cher' },
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

  it('ranks by title match, then by occurrences in the text, then alphabetically, across types', () => {
    const base = { createdAt: 1, updatedAt: 1 }
    mockedSearchCharacters.mockReturnValue([
      { id: 'c1', name: 'Zed', description: 'riven riven riven', ...base },
      { id: 'c2', name: 'Riven', description: 'x', ...base },
      { id: 'c3', name: 'Mont Riven', description: 'x', ...base },
    ])
    mockedSearchNotes.mockReturnValue([
      { id: 'n1', title: 'Rivendell', content: 'x', ...base },
      { id: 'n2', title: 'Amy', content: 'riven', ...base },
    ])
    mockedSearchDocumentationEntries.mockReturnValue([])

    expect(searchKnowledgeBase('riven', storyId).map((r) => r.id)).toEqual(['c2', 'n1', 'c3', 'c1', 'n2'])
  })

  it('shows the passage around the first match in a long text', () => {
    const content = `${'a '.repeat(150)}needle ${'b '.repeat(150)}`
    mockedSearchCharacters.mockReturnValue([{ id: 'c1', name: 'X', description: content, createdAt: 1, updatedAt: 1 }])
    mockedSearchNotes.mockReturnValue([])
    mockedSearchDocumentationEntries.mockReturnValue([])

    const [result] = searchKnowledgeBase('needle', storyId)
    expect(result.snippet.startsWith('…')).toBe(true)
    expect(result.snippet).toContain('needle')
    expect(result.snippet.length).toBeLessThanOrEqual(201)
  })
})
