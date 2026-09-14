import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentationPanel } from './DocumentationPanel'
import type { DocumentationEntry } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/lib/documentationApi', () => ({
  fetchDocumentation: vi.fn(),
  createDocumentationEntry: vi.fn(),
  updateDocumentationEntry: vi.fn(),
  deleteDocumentationEntry: vi.fn(),
}))

import { fetchDocumentation, createDocumentationEntry, deleteDocumentationEntry } from '@/lib/documentationApi'

const mockedFetch = vi.mocked(fetchDocumentation)
const mockedCreate = vi.mocked(createDocumentationEntry)
const mockedDelete = vi.mocked(deleteDocumentationEntry)

const source: DocumentationEntry = {
  id: '1',
  title: 'Gravité lunaire',
  content: 'Un sixième de la gravité terrestre',
  url: 'https://example.com/gravite',
  createdAt: 1000,
  updatedAt: 1000,
}

describe('DocumentationPanel', () => {
  beforeEach(() => {
    mockRouterPush.mockReset()
    mockedFetch.mockReset()
    mockedCreate.mockReset()
    mockedDelete.mockReset()
    mockedFetch.mockResolvedValue([])
  })

  it('shows the existing entries loaded on mount, including the url as a link', async () => {
    mockedFetch.mockResolvedValue([source])
    render(<DocumentationPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByText('Gravité lunaire')).toBeInTheDocument()
    })
    expect(screen.getByText('Un sixième de la gravité terrestre')).toBeInTheDocument()
    expect(screen.getByTestId('documentation-url-link')).toHaveAttribute('href', 'https://example.com/gravite')
  })

  it('does not render a url link when the entry has none', async () => {
    mockedFetch.mockResolvedValue([{ ...source, url: null }])
    render(<DocumentationPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByText('Gravité lunaire')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('documentation-url-link')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no entries', async () => {
    render(<DocumentationPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByText('No documentation yet.')).toBeInTheDocument()
    })
  })

  it('creates an entry from just a title and redirects to its edit page', async () => {
    const created: DocumentationEntry = {
      id: '2',
      title: 'Recherche',
      content: '',
      url: null,
      createdAt: 2000,
      updatedAt: 2000,
    }
    mockedCreate.mockResolvedValue(created)
    const user = userEvent.setup()

    render(<DocumentationPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled())

    await user.type(screen.getByTestId('documentation-title-input'), 'Recherche')
    await user.click(screen.getByTestId('documentation-save-button'))

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith('test-story', { title: 'Recherche', content: '' })
    })
    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/documentation/2')
  })

  it('shows a validation error when submitting an empty form', async () => {
    const user = userEvent.setup()
    render(<DocumentationPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled())

    await user.click(screen.getByTestId('documentation-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required.')
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('navigates to the edit page when clicking anywhere on the card', async () => {
    mockedFetch.mockResolvedValue([source])
    const user = userEvent.setup()

    render(<DocumentationPanel storyId="test-story" />)
    await waitFor(() => expect(screen.getByText('Gravité lunaire')).toBeInTheDocument())

    await user.click(screen.getByTestId('documentation-item'))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/documentation/1')
  })

  it('does not show a separate edit button', async () => {
    mockedFetch.mockResolvedValue([source])

    render(<DocumentationPanel storyId="test-story" />)
    await waitFor(() => expect(screen.getByText('Gravité lunaire')).toBeInTheDocument())

    expect(screen.queryByTestId('documentation-edit-button')).not.toBeInTheDocument()
  })

  it('asks for confirmation before deleting, and does not delete until confirmed', async () => {
    mockedFetch.mockResolvedValue([source])
    mockedDelete.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<DocumentationPanel storyId="test-story" />)
    await waitFor(() => expect(screen.getByText('Gravité lunaire')).toBeInTheDocument())

    await user.click(screen.getByTestId('documentation-delete-button'))

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    expect(mockedDelete).not.toHaveBeenCalled()
    expect(screen.getByTestId('documentation-item')).toBeInTheDocument()

    await user.click(screen.getByTestId('confirm-dialog-confirm'))

    await waitFor(() => {
      expect(screen.queryByTestId('documentation-item')).not.toBeInTheDocument()
    })
    expect(mockedDelete).toHaveBeenCalledWith('test-story', '1')
    expect(mockRouterPush).not.toHaveBeenCalledWith('/story/test-story/documentation/1')
  })

  it('does not delete the entry when the confirmation dialog is cancelled', async () => {
    mockedFetch.mockResolvedValue([source])
    const user = userEvent.setup()

    render(<DocumentationPanel storyId="test-story" />)
    await waitFor(() => expect(screen.getByText('Gravité lunaire')).toBeInTheDocument())

    await user.click(screen.getByTestId('documentation-delete-button'))
    await user.click(screen.getByTestId('confirm-dialog-cancel'))

    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
    expect(mockedDelete).not.toHaveBeenCalled()
    expect(screen.getByTestId('documentation-item')).toBeInTheDocument()
  })

  it('shows an error message when saving fails', async () => {
    mockedCreate.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()

    render(<DocumentationPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled())

    await user.type(screen.getByTestId('documentation-title-input'), 'Recherche')
    await user.click(screen.getByTestId('documentation-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})
