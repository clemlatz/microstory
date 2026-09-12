import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotesPanel } from './NotesPanel'
import type { Note } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/lib/notesApi', () => ({
  fetchNotes: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}))

import { fetchNotes, createNote, deleteNote } from '@/lib/notesApi'

const mockedFetchNotes = vi.mocked(fetchNotes)
const mockedCreateNote = vi.mocked(createNote)
const mockedDeleteNote = vi.mocked(deleteNote)

const idea: Note = {
  id: '1',
  title: 'Règle du monde',
  content: 'La magie coûte cher',
  createdAt: 1000,
  updatedAt: 1000,
}

describe('NotesPanel', () => {
  beforeEach(() => {
    mockRouterPush.mockReset()
    mockedFetchNotes.mockReset()
    mockedCreateNote.mockReset()
    mockedDeleteNote.mockReset()
    mockedFetchNotes.mockResolvedValue([])
  })

  it('shows the existing notes loaded on mount', async () => {
    mockedFetchNotes.mockResolvedValue([idea])
    render(<NotesPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByText('Règle du monde')).toBeInTheDocument()
    })
    expect(screen.getByText('La magie coûte cher')).toBeInTheDocument()
  })

  it('shows an empty state when there are no notes', async () => {
    render(<NotesPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByText('No notes yet.')).toBeInTheDocument()
    })
  })

  it('creates a note from just a title and redirects to its edit page', async () => {
    const created: Note = { id: '2', title: 'Idée', content: '', createdAt: 2000, updatedAt: 2000 }
    mockedCreateNote.mockResolvedValue(created)
    const user = userEvent.setup()

    render(<NotesPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchNotes).toHaveBeenCalled())

    await user.type(screen.getByTestId('note-title-input'), 'Idée')
    await user.click(screen.getByTestId('note-save-button'))

    await waitFor(() => {
      expect(mockedCreateNote).toHaveBeenCalledWith('test-story', { title: 'Idée', content: '' })
    })
    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/note/2')
  })

  it('shows a validation error when submitting an empty form', async () => {
    const user = userEvent.setup()
    render(<NotesPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchNotes).toHaveBeenCalled())

    await user.click(screen.getByTestId('note-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required.')
    expect(mockedCreateNote).not.toHaveBeenCalled()
  })

  it('navigates to the note edit page when clicking edit', async () => {
    mockedFetchNotes.mockResolvedValue([idea])
    const user = userEvent.setup()

    render(<NotesPanel storyId="test-story" />)
    await waitFor(() => expect(screen.getByText('Règle du monde')).toBeInTheDocument())

    await user.click(screen.getByTestId('note-edit-button'))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/note/1')
  })

  it('deletes a note', async () => {
    mockedFetchNotes.mockResolvedValue([idea])
    mockedDeleteNote.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<NotesPanel storyId="test-story" />)
    await waitFor(() => expect(screen.getByText('Règle du monde')).toBeInTheDocument())

    await user.click(screen.getByTestId('note-delete-button'))

    await waitFor(() => {
      expect(screen.queryByTestId('note-item')).not.toBeInTheDocument()
    })
    expect(mockedDeleteNote).toHaveBeenCalledWith('test-story', '1')
  })

  it('shows an error message when saving fails', async () => {
    mockedCreateNote.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()

    render(<NotesPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchNotes).toHaveBeenCalled())

    await user.type(screen.getByTestId('note-title-input'), 'Idée')
    await user.click(screen.getByTestId('note-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})
