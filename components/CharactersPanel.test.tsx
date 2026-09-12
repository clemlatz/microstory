import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharactersPanel } from './CharactersPanel'
import type { Character } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/lib/charactersApi', () => ({
  fetchCharacters: vi.fn(),
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
}))

import {
  fetchCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from '@/lib/charactersApi'

const mockedFetchCharacters = vi.mocked(fetchCharacters)
const mockedCreateCharacter = vi.mocked(createCharacter)
const mockedUpdateCharacter = vi.mocked(updateCharacter)
const mockedDeleteCharacter = vi.mocked(deleteCharacter)

const alice: Character = {
  id: '1',
  name: 'Alice',
  description: 'Une héroïne curieuse',
  createdAt: 1000,
  updatedAt: 1000,
}

describe('CharactersPanel', () => {
  beforeEach(() => {
    mockRouterPush.mockReset()
    mockedFetchCharacters.mockReset()
    mockedCreateCharacter.mockReset()
    mockedUpdateCharacter.mockReset()
    mockedDeleteCharacter.mockReset()
    mockedFetchCharacters.mockResolvedValue([])
  })

  it('shows the existing characters loaded on mount', async () => {
    mockedFetchCharacters.mockResolvedValue([alice])
    render(<CharactersPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
    expect(screen.getByText('Une héroïne curieuse')).toBeInTheDocument()
  })

  it('shows an empty state when there are no characters', async () => {
    render(<CharactersPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByText('No characters yet.')).toBeInTheDocument()
    })
  })

  it('creates a character from just a name and redirects to its edit page', async () => {
    const created: Character = { id: '2', name: 'Bob', description: '', createdAt: 2000, updatedAt: 2000 }
    mockedCreateCharacter.mockResolvedValue(created)
    const user = userEvent.setup()

    render(<CharactersPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchCharacters).toHaveBeenCalled())

    await user.type(screen.getByTestId('character-name-input'), 'Bob')
    await user.click(screen.getByTestId('character-save-button'))

    await waitFor(() => {
      expect(mockedCreateCharacter).toHaveBeenCalledWith('test-story', { name: 'Bob', description: '' })
    })
    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/character/2')
  })

  it('shows a validation error when submitting an empty form', async () => {
    const user = userEvent.setup()
    render(<CharactersPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchCharacters).toHaveBeenCalled())

    await user.click(screen.getByTestId('character-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Name is required.')
    expect(mockedCreateCharacter).not.toHaveBeenCalled()
  })

  it('navigates to the character edit page when clicking edit', async () => {
    mockedFetchCharacters.mockResolvedValue([alice])
    const user = userEvent.setup()

    render(<CharactersPanel storyId="test-story" />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    await user.click(screen.getByTestId('character-edit-button'))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/test-story/character/1')
  })

  it('deletes a character', async () => {
    mockedFetchCharacters.mockResolvedValue([alice])
    mockedDeleteCharacter.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<CharactersPanel storyId="test-story" />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    await user.click(screen.getByTestId('character-delete-button'))

    await waitFor(() => {
      expect(screen.queryByTestId('character-item')).not.toBeInTheDocument()
    })
    expect(mockedDeleteCharacter).toHaveBeenCalledWith('test-story', '1')
  })

  it('shows an error message when saving fails', async () => {
    mockedCreateCharacter.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()

    render(<CharactersPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchCharacters).toHaveBeenCalled())

    await user.type(screen.getByTestId('character-name-input'), 'Bob')
    await user.click(screen.getByTestId('character-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})
