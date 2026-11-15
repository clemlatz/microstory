import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchPanel } from './SearchPanel'
import type { SearchResult } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/lib/searchApi', () => ({
  searchKnowledgeBase: vi.fn(),
}))

vi.mock('@/lib/charactersApi', () => ({
  fetchCharacters: vi.fn().mockResolvedValue([{ id: 'c9', name: 'Bob', description: 'Un forgeron bourru' }]),
}))
vi.mock('@/lib/notesApi', () => ({
  fetchNotes: vi.fn().mockResolvedValue([{ id: 'n9', title: 'Carte du royaume', content: 'Trois provinces' }]),
}))
vi.mock('@/lib/documentationApi', () => ({
  fetchDocumentation: vi.fn().mockResolvedValue([]),
}))

import { searchKnowledgeBase } from '@/lib/searchApi'

const mockedSearch = vi.mocked(searchKnowledgeBase)

const results: SearchResult[] = [
  { type: 'character', id: 'c1', title: 'Alice', snippet: 'Une héroïne curieuse' },
  { type: 'note', id: 'n1', title: 'Règle du monde', snippet: 'La magie coûte cher' },
  { type: 'documentation', id: 'd1', title: 'Gravité', snippet: 'Un sixième' },
]

// Titles are split by <strong> around the highlighted term, so match on the whole title element's text.
const title = (text: string) => (_: string, el: Element | null) =>
  el?.tagName === 'SPAN' && el.textContent === text

describe('SearchPanel', () => {
  beforeEach(() => {
    mockRouterPush.mockReset()
    mockedSearch.mockReset()
    window.localStorage.clear()
  })

  it('does not search on mount with an empty query', () => {
    render(<SearchPanel storyId="test-story" />)
    expect(mockedSearch).not.toHaveBeenCalled()
  })

  it('searches after the user stops typing, debounced', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'alice')
    expect(mockedSearch).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(mockedSearch).toHaveBeenCalledWith('test-story', 'alice')
    })
    expect(mockedSearch).toHaveBeenCalledTimes(1)
  })

  it('renders a flat list showing each result\'s type', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')

    await waitFor(() => {
      expect(screen.getByText(title('Alice'))).toBeInTheDocument()
    })
    expect(screen.getByText(title('Règle du monde'))).toBeInTheDocument()
    expect(screen.getByText(title('Gravité'))).toBeInTheDocument()
    expect(screen.getAllByTestId('search-result-type').map((el) => el.textContent)).toEqual(
      results.map((r) => ({ character: 'Character', note: 'Note', documentation: 'Documentation' })[r.type]),
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('clears results when the query is cleared', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    const input = screen.getByTestId('search-input')
    await user.type(input, 'a')
    await waitFor(() => {
      expect(screen.getByText(title('Alice'))).toBeInTheDocument()
    })

    await user.clear(input)

    await waitFor(() => {
      expect(screen.queryByText(title('Alice'))).not.toBeInTheDocument()
    })
  })

  it('navigates to the character edit page when a character result is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')
    await waitFor(() => screen.getByText(title('Alice')))

    await user.click(screen.getByText(title('Alice')))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/character/c1')
  })

  it('navigates to the note edit page when a note result is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')
    await waitFor(() => screen.getByText(title('Règle du monde')))

    await user.click(screen.getByText(title('Règle du monde')))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/note/n1')
  })

  it('navigates to the documentation edit page when a documentation result is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')
    await waitFor(() => screen.getByText(title('Gravité')))

    await user.click(screen.getByText(title('Gravité')))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/documentation/d1')
  })

  it('shows a no-results message when the search returns nothing', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue([])
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'dragon')

    await waitFor(() => {
      expect(screen.getByText('No results.')).toBeInTheDocument()
    })
  })

  it('shows an error message when the search fails', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockRejectedValue(new Error('boom'))
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('calls onActiveChange(true) once a query is typed, and (false) once cleared', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    const onActiveChange = vi.fn()
    render(<SearchPanel storyId="test-story" onActiveChange={onActiveChange} />)

    expect(onActiveChange).not.toHaveBeenCalledWith(true)

    const input = screen.getByTestId('search-input')
    await user.type(input, 'a')
    expect(onActiveChange).toHaveBeenLastCalledWith(true)

    await user.clear(input)
    expect(onActiveChange).toHaveBeenLastCalledWith(false)
  })

  it('opens the highlighted result with Enter, the first one by default', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')
    await waitFor(() => screen.getByText(title('Alice')))

    await user.keyboard('{Enter}')
    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/character/c1')
  })

  it('moves the highlight with the arrow keys, without leaving the field', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')
    await waitFor(() => screen.getByText(title('Alice')))

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}')
    const items = screen.getAllByRole('option')
    expect(items[1]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('search-input')).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/note/n1')
  })

  it('does nothing on Enter when there are no results', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue([])
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'zzz')
    await waitFor(() => screen.getByText('No results.'))

    await user.keyboard('{Enter}')
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('does not show the previous search\'s results when typing again after clearing the field', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValueOnce(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')
    await waitFor(() => screen.getByText(title('Alice')))

    mockedSearch.mockReturnValue(new Promise(() => {}))
    await user.clear(screen.getByTestId('search-input'))
    await user.type(screen.getByTestId('search-input'), 'g')

    expect(screen.queryByText(title('Alice'))).not.toBeInTheDocument()
  })

  it('shows the recently viewed entries when nothing is typed, openable with the keyboard', async () => {
    window.localStorage.setItem(
      'microstory_recent_entities_test-story',
      JSON.stringify([
        { kind: 'note', id: 'n9', title: 'Carte du royaume' },
        { kind: 'character', id: 'c9', title: 'Bob' },
      ]),
    )
    const user = userEvent.setup({ delay: null })
    render(<SearchPanel storyId="test-story" />)

    expect(screen.getByTestId('search-recent-heading')).toHaveTextContent('Recently viewed')
    const items = screen.getAllByTestId('search-result-item')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Carte du royaume')
    expect(items[0]).toHaveTextContent('Note')
    expect(items[1]).toHaveTextContent('Bob')
    await waitFor(() => expect(items[1]).toHaveTextContent('Un forgeron bourru'))
    expect(items[0]).toHaveTextContent('Trois provinces')

    await user.keyboard('{ArrowDown}{Enter}')
    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/character/c9')

    mockedSearch.mockResolvedValue(results)
    await user.type(screen.getByTestId('search-input'), 'a')
    expect(screen.queryByTestId('search-recent-heading')).not.toBeInTheDocument()
  })

  it('puts the matching search term in bold in titles and excerpts, whatever its case', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue([
      { type: 'character', id: 'c1', title: 'Corwin Vale', snippet: 'Il arrive à Rivenhollow (riven.)' },
    ])
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'RIVEN.')
    await waitFor(() => screen.getByText('Corwin Vale'))

    const bold = screen.getAllByText((_, el) => el?.tagName === 'STRONG').map((el) => el.textContent)
    expect(bold).toEqual(['riven.'])
  })
})
