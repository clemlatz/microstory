import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryHomeView } from './StoryHomeView'
import type { Story } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/lib/charactersApi', () => ({
  fetchCharacters: vi.fn().mockResolvedValue([]),
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
}))

vi.mock('@/lib/notesApi', () => ({
  fetchNotes: vi.fn().mockResolvedValue([]),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}))

vi.mock('@/lib/documentationApi', () => ({
  fetchDocumentation: vi.fn().mockResolvedValue([]),
  createDocumentationEntry: vi.fn(),
  deleteDocumentationEntry: vi.fn(),
}))

const story: Story = {
  id: 'story-1',
  title: 'Le Voyage de Nour',
  presentation: '',
  createdAt: 1000,
  updatedAt: 2000,
}

describe('StoryHomeView', () => {
  it('renders only the characters section when active', async () => {
    render(<StoryHomeView story={story} section="characters" />)
    await waitFor(() => expect(screen.getByText(/No characters/)).toBeInTheDocument())
    expect(screen.queryByText(/No notes/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('story-presentation-preview')).not.toBeInTheDocument()
  })

  it('renders only the notes section when active', async () => {
    render(<StoryHomeView story={story} section="notes" />)
    await waitFor(() => expect(screen.getByText(/No notes/)).toBeInTheDocument())
    expect(screen.queryByText(/No characters/)).not.toBeInTheDocument()
  })

  it('renders only the documentation section when active', async () => {
    render(<StoryHomeView story={story} section="documentation" />)
    await waitFor(() => expect(screen.getByText(/No documentation/)).toBeInTheDocument())
    expect(screen.queryByText(/No notes/)).not.toBeInTheDocument()
  })

  it('renders only the search panel when the search section is active', async () => {
    render(<StoryHomeView story={story} section="search" />)
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
    expect(screen.queryByTestId('story-presentation-preview')).not.toBeInTheDocument()
  })

  it('does not render the search input on other sections', async () => {
    render(<StoryHomeView story={story} section="characters" />)
    await waitFor(() => expect(screen.getByText(/No characters/)).toBeInTheDocument())
    expect(screen.queryByTestId('search-input')).not.toBeInTheDocument()
  })

  it('shows a placeholder when the story has no presentation yet', async () => {
    render(<StoryHomeView story={story} section="overview" />)
    expect(screen.getByTestId('story-presentation-preview')).toHaveTextContent(/No presentation yet/)
  })

  it('shows the story presentation text when set', async () => {
    const storyWithPresentation = { ...story, presentation: 'A polar station cut off from the world.' }
    render(<StoryHomeView story={storyWithPresentation} section="overview" />)
    expect(screen.getByTestId('story-presentation-preview')).toHaveTextContent(
      'A polar station cut off from the world.',
    )
  })

  it('navigates to the presentation edit page', async () => {
    const user = userEvent.setup()
    render(<StoryHomeView story={story} section="overview" />)

    await user.click(screen.getByTestId('story-presentation-edit-button'))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/story-1/presentation')
  })
})
