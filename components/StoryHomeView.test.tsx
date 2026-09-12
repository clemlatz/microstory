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

const story: Story = {
  id: 'story-1',
  title: 'Le Voyage de Nour',
  createdAt: 1000,
  updatedAt: 2000,
  lastPassagePreview: null,
}

describe('StoryHomeView', () => {
  it('shows the story title', async () => {
    render(<StoryHomeView story={story} onOpenManuscript={vi.fn()} />)
    expect(screen.getByTestId('story-title')).toHaveTextContent('Le Voyage de Nour')
    await waitFor(() => expect(screen.getByText(/No characters/)).toBeInTheDocument())
  })

  it('renders the character list', async () => {
    render(<StoryHomeView story={story} onOpenManuscript={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/No characters/)).toBeInTheDocument())
  })

  it('renders the notes list', async () => {
    render(<StoryHomeView story={story} onOpenManuscript={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/No notes/)).toBeInTheDocument())
  })

  it('calls onOpenManuscript when the "Manuscrit" button is clicked', async () => {
    const user = userEvent.setup()
    const onOpenManuscript = vi.fn()
    render(<StoryHomeView story={story} onOpenManuscript={onOpenManuscript} />)

    await user.click(screen.getByTestId('open-manuscript-button'))

    expect(onOpenManuscript).toHaveBeenCalledTimes(1)
  })

  it('navigates back to the stories list', async () => {
    const user = userEvent.setup()
    render(<StoryHomeView story={story} onOpenManuscript={vi.fn()} />)

    await user.click(screen.getByTestId('stories-back-button'))

    expect(mockRouterPush).toHaveBeenCalledWith('/stories')
  })

  it('hides the "Manuscrit" button when onOpenManuscript is not provided', async () => {
    render(<StoryHomeView story={story} />)
    await waitFor(() => expect(screen.getByText(/No characters/)).toBeInTheDocument())

    expect(screen.queryByTestId('open-manuscript-button')).not.toBeInTheDocument()
  })
})
