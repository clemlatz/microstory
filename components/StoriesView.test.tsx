import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { StoriesView } from './StoriesView'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/storiesApi', () => ({
  fetchStories: vi.fn(),
  createStory: vi.fn(),
  renameStory: vi.fn(),
  deleteStory: vi.fn(),
}))

import { fetchStories, createStory, renameStory, deleteStory } from '@/lib/storiesApi'

const STORY = {
  id: 's1',
  title: 'Le dernier hiver',
  presentation: '',
  createdAt: 1,
  updatedAt: 2,
}

describe('StoriesView', () => {
  beforeEach(() => {
    vi.mocked(fetchStories).mockReset().mockResolvedValue([STORY])
    vi.mocked(createStory).mockReset()
    vi.mocked(renameStory).mockReset()
    vi.mocked(deleteStory).mockReset()
  })

  it('lists stories with title', async () => {
    render(<StoriesView />)
    expect(await screen.findByText('Le dernier hiver')).toBeInTheDocument()
  })

  it('creates a new story from the form', async () => {
    const user = userEvent.setup()
    vi.mocked(createStory).mockResolvedValue({ ...STORY, id: 's2', title: 'Nouvelle histoire' })
    render(<StoriesView />)
    await screen.findByText('Le dernier hiver')

    await user.click(screen.getByTestId('create-story-button'))
    await user.type(screen.getByTestId('new-story-title-input'), 'Nouvelle histoire')
    await user.click(screen.getByTestId('new-story-submit-button'))

    await waitFor(() => expect(createStory).toHaveBeenCalledWith('Nouvelle histoire'))
  })

  it('renames a story inline', async () => {
    const user = userEvent.setup()
    vi.mocked(renameStory).mockResolvedValue({ ...STORY, title: 'Titre modifié' })
    render(<StoriesView />)
    await screen.findByText('Le dernier hiver')

    await user.click(screen.getByTestId('story-rename-button'))
    const input = screen.getByTestId('story-title-edit-input')
    await user.clear(input)
    await user.type(input, 'Titre modifié')
    await user.click(screen.getByTestId('story-title-save-button'))

    await waitFor(() => expect(renameStory).toHaveBeenCalledWith('s1', 'Titre modifié'))
  })

  it('deletes a story after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteStory).mockResolvedValue(undefined)
    render(<StoriesView />)
    await screen.findByText('Le dernier hiver')

    await user.click(screen.getByTestId('story-delete-button'))
    await user.click(screen.getByTestId('confirm-dialog-confirm'))

    await waitFor(() => expect(deleteStory).toHaveBeenCalledWith('s1'))
  })

  it('shows an error and keeps the entered title when creating a story fails', async () => {
    const user = userEvent.setup()
    vi.mocked(createStory).mockRejectedValue(new Error('network down'))
    render(<StoriesView />)
    await screen.findByText('Le dernier hiver')

    await user.click(screen.getByTestId('create-story-button'))
    await user.type(screen.getByTestId('new-story-title-input'), 'Nouvelle histoire')
    await user.click(screen.getByTestId('new-story-submit-button'))

    expect(await screen.findByTestId('stories-action-error')).toHaveTextContent('network down')
    expect(screen.getByTestId('new-story-title-input')).toHaveValue('Nouvelle histoire')
  })

  it('shows an error and stays in edit mode when renaming a story fails', async () => {
    const user = userEvent.setup()
    vi.mocked(renameStory).mockRejectedValue(new Error('rename failed'))
    render(<StoriesView />)
    await screen.findByText('Le dernier hiver')

    await user.click(screen.getByTestId('story-rename-button'))
    const input = screen.getByTestId('story-title-edit-input')
    await user.clear(input)
    await user.type(input, 'Titre modifié')
    await user.click(screen.getByTestId('story-title-save-button'))

    expect(await screen.findByTestId('stories-action-error')).toHaveTextContent('rename failed')
    expect(screen.getByTestId('story-title-edit-input')).toHaveValue('Titre modifié')
  })

  it('shows an error when deleting a story fails', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteStory).mockRejectedValue(new Error('delete failed'))
    render(<StoriesView />)
    await screen.findByText('Le dernier hiver')

    await user.click(screen.getByTestId('story-delete-button'))
    await user.click(screen.getByTestId('confirm-dialog-confirm'))

    expect(await screen.findByTestId('stories-action-error')).toHaveTextContent('delete failed')
  })
})
