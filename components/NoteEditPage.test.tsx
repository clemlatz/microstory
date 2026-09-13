import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoteEditPage } from './NoteEditPage'
import type { Note, Story } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/lib/notesApi', () => ({
  updateNote: vi.fn(),
}))

import { updateNote } from '@/lib/notesApi'

const mockedUpdateNote = vi.mocked(updateNote)

// The real BlockNote editor is covered by NoteContentEditor's own tests;
// here it's stubbed as a plain textarea driven by the same
// initialMarkdown/onChangeMarkdown contract, so this suite only exercises
// NoteEditPage's own autosave/back/validation logic.
//
// Real timers throughout (not vi.useFakeTimers()): per this project's
// testing notes, React's own scheduler relies on setTimeout internally, so
// globally faked timers deadlock userEvent interactions that trigger a
// render. The debounce delay is short enough that waiting it out for real
// is cheap.
vi.mock('./NoteContentEditor', () => ({
  NoteContentEditor: ({
    initialMarkdown,
    onChangeMarkdown,
  }: {
    initialMarkdown: string
    onChangeMarkdown: (markdown: string) => void
  }) => (
    <textarea
      data-testid="note-content-editor-stub"
      defaultValue={initialMarkdown}
      onChange={(event) => onChangeMarkdown(event.target.value)}
    />
  ),
}))

const idea: Note = {
  id: '1',
  title: 'Règle du monde',
  content: 'La magie coûte cher',
  createdAt: 1000,
  updatedAt: 1000,
}

const story: Story = {
  id: 'story-1',
  title: 'Le Voyage de Nour',
  presentation: '',
  createdAt: 1000,
  updatedAt: 2000,
  lastPassagePreview: null,
}

const WAIT_FOR_AUTOSAVE = { timeout: 2000 }

describe('NoteEditPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockRouterPush.mockReset()
    mockedUpdateNote.mockReset()
    mockedUpdateNote.mockResolvedValue(idea)
  })

  it('shows the note title and content, with no save button', async () => {
    render(<NoteEditPage story={story} note={idea} llmWritingEnabled={true} />)

    expect(screen.getByTestId('note-page-title-input')).toHaveValue('Règle du monde')
    expect(await screen.findByTestId('note-content-editor-stub')).toHaveValue('La magie coûte cher')
    expect(screen.queryByTestId('note-page-save-button')).not.toBeInTheDocument()
  })

  it('shows the note title in the title bar instead of the story title', async () => {
    render(<NoteEditPage story={story} note={idea} llmWritingEnabled={true} />)

    expect(screen.getByTestId('story-title')).toHaveTextContent('Règle du monde')
  })

  it('autosaves a title change after the debounce delay', async () => {
    const user = userEvent.setup()
    render(<NoteEditPage story={story} note={idea} llmWritingEnabled={true} />)

    await user.clear(screen.getByTestId('note-page-title-input'))
    await user.type(screen.getByTestId('note-page-title-input'), 'Règle révisée')
    expect(mockedUpdateNote).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(mockedUpdateNote).toHaveBeenCalledWith('story-1', '1', {
        title: 'Règle révisée',
        content: 'La magie coûte cher',
      })
    }, WAIT_FOR_AUTOSAVE)
    expect(mockedUpdateNote).toHaveBeenCalledTimes(1)
  })

  it('autosaves a content change after the debounce delay', async () => {
    const user = userEvent.setup()
    render(<NoteEditPage story={story} note={idea} llmWritingEnabled={true} />)

    await user.clear(await screen.findByTestId('note-content-editor-stub'))
    await user.type(screen.getByTestId('note-content-editor-stub'), 'La magie a un prix')

    await waitFor(() => {
      expect(mockedUpdateNote).toHaveBeenCalledWith('story-1', '1', {
        title: 'Règle du monde',
        content: 'La magie a un prix',
      })
    }, WAIT_FOR_AUTOSAVE)
  })

  it('flushes a pending save immediately when navigating back via the drawer', async () => {
    const user = userEvent.setup()
    render(<NoteEditPage story={story} note={idea} llmWritingEnabled={true} />)

    await user.type(screen.getByTestId('note-page-title-input'), ' révisée')
    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-my-stories'))

    expect(mockedUpdateNote).toHaveBeenCalledWith('story-1', '1', {
      title: 'Règle du monde révisée',
      content: 'La magie coûte cher',
    })
    expect(mockRouterPush).toHaveBeenCalledWith('/stories')
  })

  it('navigates back without saving when nothing changed', async () => {
    const user = userEvent.setup()
    render(<NoteEditPage story={story} note={idea} llmWritingEnabled={true} />)

    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-my-stories'))

    expect(mockRouterPush).toHaveBeenCalledWith('/stories')
    expect(mockedUpdateNote).not.toHaveBeenCalled()
  })

  it('does not autosave while the title is empty', async () => {
    const user = userEvent.setup()
    render(<NoteEditPage story={story} note={idea} llmWritingEnabled={true} />)

    await user.clear(screen.getByTestId('note-page-title-input'))
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(mockedUpdateNote).not.toHaveBeenCalled()
  })

  it('does not autosave while the content is empty', async () => {
    const user = userEvent.setup()
    render(<NoteEditPage story={story} note={idea} llmWritingEnabled={true} />)

    await user.clear(await screen.findByTestId('note-content-editor-stub'))
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(mockedUpdateNote).not.toHaveBeenCalled()
  })

  it('shows an error message when autosaving fails', async () => {
    mockedUpdateNote.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<NoteEditPage story={story} note={idea} llmWritingEnabled={true} />)

    await user.type(screen.getByTestId('note-page-title-input'), ' révisée')

    expect(await screen.findByRole('alert', {}, WAIT_FOR_AUTOSAVE)).toHaveTextContent('boom')
  })
})
