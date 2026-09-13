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

import { searchKnowledgeBase } from '@/lib/searchApi'

const mockedSearch = vi.mocked(searchKnowledgeBase)

const results: SearchResult[] = [
  { type: 'character', id: 'c1', title: 'Alice', snippet: 'Une héroïne curieuse' },
  { type: 'note', id: 'n1', title: 'Règle du monde', snippet: 'La magie coûte cher' },
  { type: 'documentation', id: 'd1', title: 'Gravité', snippet: 'Un sixième' },
]

describe('SearchPanel', () => {
  beforeEach(() => {
    mockRouterPush.mockReset()
    mockedSearch.mockReset()
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

  it('renders results grouped by type', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
    expect(screen.getByText('Règle du monde')).toBeInTheDocument()
    expect(screen.getByText('Gravité')).toBeInTheDocument()
  })

  it('clears results when the query is cleared', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    const input = screen.getByTestId('search-input')
    await user.type(input, 'a')
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    await user.clear(input)

    await waitFor(() => {
      expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    })
  })

  it('navigates to the character edit page when a character result is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')
    await waitFor(() => screen.getByText('Alice'))

    await user.click(screen.getByText('Alice'))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/character/c1')
  })

  it('navigates to the note edit page when a note result is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')
    await waitFor(() => screen.getByText('Règle du monde'))

    await user.click(screen.getByText('Règle du monde'))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/note/n1')
  })

  it('navigates to the documentation edit page when a documentation result is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    mockedSearch.mockResolvedValue(results)
    render(<SearchPanel storyId="test-story" />)

    await user.type(screen.getByTestId('search-input'), 'a')
    await waitFor(() => screen.getByText('Gravité'))

    await user.click(screen.getByText('Gravité'))

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
})
