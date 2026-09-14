import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryPresentationEditPage } from './StoryPresentationEditPage'
import type { Story } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/lib/storiesApi', () => ({
  renameStory: vi.fn(),
  updateStoryPresentation: vi.fn(),
}))

import { renameStory, updateStoryPresentation } from '@/lib/storiesApi'

const mockedRenameStory = vi.mocked(renameStory)
const mockedUpdateStoryPresentation = vi.mocked(updateStoryPresentation)

// See NoteEditPage.test.tsx's comment: BlockNote is stubbed as a plain
// textarea here so this suite only exercises the page's own
// autosave/back logic, and real timers are used throughout since global
// fake timers deadlock userEvent's own scheduling.
vi.mock('./StoryPresentationEditor', () => ({
  StoryPresentationEditor: ({
    initialMarkdown,
    onChangeMarkdown,
  }: {
    initialMarkdown: string
    onChangeMarkdown: (markdown: string) => void
  }) => (
    <textarea
      data-testid="story-presentation-editor-stub"
      defaultValue={initialMarkdown}
      onChange={(event) => onChangeMarkdown(event.target.value)}
    />
  ),
}))

const story: Story = {
  id: 'story-1',
  title: 'Le dernier hiver',
  presentation: 'Une station polaire coupée du monde.',
  createdAt: 1000,
  updatedAt: 1000,
  lastPassagePreview: null,
}

const WAIT_FOR_AUTOSAVE = { timeout: 2000 }

describe('StoryPresentationEditPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockRouterPush.mockReset()
    mockedRenameStory.mockReset()
    mockedRenameStory.mockResolvedValue(story)
    mockedUpdateStoryPresentation.mockReset()
    mockedUpdateStoryPresentation.mockResolvedValue(story)
  })

  it('shows the story title once, as an editable field, and the presentation, with no save button', async () => {
    render(<StoryPresentationEditPage story={story} llmWritingEnabled={true} />)

    expect(screen.getByTestId('story-title')).toHaveValue('Le dernier hiver')
    expect(await screen.findByTestId('story-presentation-editor-stub')).toHaveValue(
      'Une station polaire coupée du monde.',
    )
    expect(screen.queryByTestId('story-presentation-save-button')).not.toBeInTheDocument()
  })

  it('updates the title bar live as the title is edited, with no duplicate heading in the body', async () => {
    const user = userEvent.setup()
    render(<StoryPresentationEditPage story={story} llmWritingEnabled={true} />)

    await user.type(screen.getByTestId('story-title'), ' Suite')

    expect(screen.getByTestId('story-title')).toHaveValue('Le dernier hiver Suite')
    expect(screen.queryByText('Le dernier hiver', { selector: 'h1' })).not.toBeInTheDocument()
  })

  it('autosaves a title change after the debounce delay', async () => {
    const user = userEvent.setup()
    render(<StoryPresentationEditPage story={story} llmWritingEnabled={true} />)

    await user.type(screen.getByTestId('story-title'), ' Suite')

    await waitFor(() => {
      expect(mockedRenameStory).toHaveBeenCalledWith('story-1', 'Le dernier hiver Suite')
    }, WAIT_FOR_AUTOSAVE)
    expect(mockedUpdateStoryPresentation).toHaveBeenCalledWith(
      'story-1',
      'Une station polaire coupée du monde.',
    )
  })

  it('autosaves a presentation change after the debounce delay', async () => {
    const user = userEvent.setup()
    render(<StoryPresentationEditPage story={story} llmWritingEnabled={true} />)

    await user.clear(await screen.findByTestId('story-presentation-editor-stub'))
    await user.type(screen.getByTestId('story-presentation-editor-stub'), 'Un nouveau pitch.')

    await waitFor(() => {
      expect(mockedUpdateStoryPresentation).toHaveBeenCalledWith('story-1', 'Un nouveau pitch.')
    }, WAIT_FOR_AUTOSAVE)
    expect(mockedUpdateStoryPresentation).toHaveBeenCalledTimes(1)
  })

  it('autosaves clearing the presentation back to empty', async () => {
    const user = userEvent.setup()
    render(<StoryPresentationEditPage story={story} llmWritingEnabled={true} />)

    await user.clear(await screen.findByTestId('story-presentation-editor-stub'))

    await waitFor(() => {
      expect(mockedUpdateStoryPresentation).toHaveBeenCalledWith('story-1', '')
    }, WAIT_FOR_AUTOSAVE)
  })

  it('does not autosave while the title is empty', async () => {
    const user = userEvent.setup()
    render(<StoryPresentationEditPage story={story} llmWritingEnabled={true} />)

    await user.clear(screen.getByTestId('story-title'))
    // No positive assertion can prove a debounced call never fires without
    // waiting past its delay — wait it out, then assert nothing happened.
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(mockedRenameStory).not.toHaveBeenCalled()
    expect(mockedUpdateStoryPresentation).not.toHaveBeenCalled()
  })

  it('flushes a pending save immediately when navigating back via the drawer', async () => {
    const user = userEvent.setup()
    render(<StoryPresentationEditPage story={story} llmWritingEnabled={true} />)

    await user.type(await screen.findByTestId('story-presentation-editor-stub'), ' Suite.')
    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-my-stories'))

    expect(mockedUpdateStoryPresentation).toHaveBeenCalledWith(
      'story-1',
      'Une station polaire coupée du monde. Suite.',
    )
    expect(mockRouterPush).toHaveBeenCalledWith('/stories')
  })

  it('navigates back without saving when nothing changed', async () => {
    const user = userEvent.setup()
    render(<StoryPresentationEditPage story={story} llmWritingEnabled={true} />)

    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-my-stories'))

    expect(mockRouterPush).toHaveBeenCalledWith('/stories')
    expect(mockedRenameStory).not.toHaveBeenCalled()
    expect(mockedUpdateStoryPresentation).not.toHaveBeenCalled()
  })

  it('shows an error message when autosaving fails', async () => {
    mockedUpdateStoryPresentation.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<StoryPresentationEditPage story={story} llmWritingEnabled={true} />)

    await user.type(await screen.findByTestId('story-presentation-editor-stub'), ' Suite.')

    expect(await screen.findByRole('alert', {}, WAIT_FOR_AUTOSAVE)).toHaveTextContent('boom')
  })
})
