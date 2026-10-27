import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryShell } from './StoryShell'
import type { Story } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

const story: Story = {
  id: 'story-1',
  title: 'Le Voyage de Nour',
  presentation: '',
  createdAt: 1000,
  updatedAt: 2000,
}

describe('StoryShell', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockRouterPush.mockClear()
  })

  it('shows the title bar and the passed-in children', () => {
    render(
      <StoryShell story={story} activeSection="characters" onNavigate={vi.fn()}>
        <p data-testid="content">content</p>
      </StoryShell>,
    )
    expect(screen.getByTestId('story-title')).toHaveTextContent('Le Voyage de Nour')
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('shows entryTitle in the title bar instead of the story title when provided', () => {
    render(
      <StoryShell
        story={story}
        activeSection="characters"
        onNavigate={vi.fn()}
        entryTitle="Adaline Marrow"
      >
        <p>content</p>
      </StoryShell>,
    )
    expect(screen.getByTestId('story-title')).toHaveTextContent('Adaline Marrow')
  })

  it('makes the entryTitle editable in the title bar when onEntryTitleChange is provided', async () => {
    const user = userEvent.setup()
    const onEntryTitleChange = vi.fn()
    render(
      <StoryShell
        story={story}
        activeSection="characters"
        onNavigate={vi.fn()}
        entryTitle="Adaline Marrow"
        onEntryTitleChange={onEntryTitleChange}
      >
        <p>content</p>
      </StoryShell>,
    )

    const input = screen.getByTestId('story-title')
    expect(input).toHaveValue('Adaline Marrow')

    await user.type(input, '!')

    expect(onEntryTitleChange).toHaveBeenCalledWith('Adaline Marrow!')
  })

  it('highlights the section passed as activeSection', async () => {
    const user = userEvent.setup()
    render(
      <StoryShell story={story} activeSection="notes" onNavigate={vi.fn()}>
        <p>content</p>
      </StoryShell>,
    )
    await user.click(screen.getByTestId('story-nav-toggle'))
    expect(screen.getByTestId('story-nav-notes')).toHaveAttribute('aria-current', 'page')
  })

  it('calls onNavigate when a drawer item is clicked', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <StoryShell story={story} activeSection="overview" onNavigate={onNavigate}>
        <p>content</p>
      </StoryShell>,
    )
    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-notes'))
    expect(onNavigate).toHaveBeenCalledWith('notes')
  })

  it('pushes to /stories by default when "My stories" is clicked', async () => {
    const user = userEvent.setup()
    render(
      <StoryShell story={story} activeSection="overview" onNavigate={vi.fn()}>
        <p>content</p>
      </StoryShell>,
    )
    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-my-stories'))
    expect(mockRouterPush).toHaveBeenCalledWith('/stories')
  })

  it('uses a custom onBackToStories when provided', async () => {
    const user = userEvent.setup()
    const onBackToStories = vi.fn()
    render(
      <StoryShell
        story={story}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={onBackToStories}
      >
        <p>content</p>
      </StoryShell>,
    )
    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-my-stories'))
    expect(onBackToStories).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  describe('deleting the displayed entry', () => {
    function renderEntry(onDeleteEntry: () => Promise<boolean>) {
      render(
        <StoryShell
          story={story}
          activeSection="notes"
          onNavigate={vi.fn()}
          entry={{ kind: 'note', id: 'n1' }}
          entryTitle="A note"
          onDeleteEntry={onDeleteEntry}
          deleteConfirmTitle="Delete this note?"
        >
          <p>content</p>
        </StoryShell>,
      )
    }

    it('asks for confirmation, then deletes and goes back to the section', async () => {
      const onDeleteEntry = vi.fn().mockResolvedValue(true)
      renderEntry(onDeleteEntry)

      await userEvent.click(screen.getByTestId('story-delete-button'))
      expect(onDeleteEntry).not.toHaveBeenCalled()
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()

      await userEvent.click(screen.getByTestId('confirm-dialog-confirm'))
      expect(onDeleteEntry).toHaveBeenCalledTimes(1)
      expect(mockRouterPush).toHaveBeenCalledWith('/story/story-1?section=notes')
    })

    it('does nothing when the confirmation is cancelled', async () => {
      const onDeleteEntry = vi.fn().mockResolvedValue(true)
      renderEntry(onDeleteEntry)

      await userEvent.click(screen.getByTestId('story-delete-button'))
      await userEvent.click(screen.getByTestId('confirm-dialog-cancel'))

      expect(onDeleteEntry).not.toHaveBeenCalled()
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('stays on the page when the delete fails', async () => {
      renderEntry(vi.fn().mockResolvedValue(false))

      await userEvent.click(screen.getByTestId('story-delete-button'))
      await userEvent.click(screen.getByTestId('confirm-dialog-confirm'))

      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('shows no delete button without onDeleteEntry', () => {
      render(
        <StoryShell story={story} activeSection="notes" onNavigate={vi.fn()}>
          <p>content</p>
        </StoryShell>,
      )
      expect(screen.queryByTestId('story-delete-button')).not.toBeInTheDocument()
    })
  })
})
