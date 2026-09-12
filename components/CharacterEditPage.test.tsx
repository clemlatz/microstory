import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterEditPage } from './CharacterEditPage'
import type { Character } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/lib/charactersApi', () => ({
  updateCharacter: vi.fn(),
}))

import { updateCharacter } from '@/lib/charactersApi'

const mockedUpdateCharacter = vi.mocked(updateCharacter)

const alice: Character = {
  id: '1',
  name: 'Alice',
  description: 'Une héroïne curieuse',
  createdAt: 1000,
  updatedAt: 1000,
}

describe('CharacterEditPage', () => {
  beforeEach(() => {
    mockRouterPush.mockReset()
    mockedUpdateCharacter.mockReset()
  })

  it('shows the character current values in large fields', () => {
    render(<CharacterEditPage storyId="story-1" character={alice} />)

    expect(screen.getByTestId('character-page-name-input')).toHaveValue('Alice')
    expect(screen.getByTestId('character-page-description-input')).toHaveValue('Une héroïne curieuse')
  })

  it('saves the changes and navigates back to the story home', async () => {
    const updated: Character = { ...alice, name: 'Alice Doe', updatedAt: 2000 }
    mockedUpdateCharacter.mockResolvedValue(updated)
    const user = userEvent.setup()

    render(<CharacterEditPage storyId="story-1" character={alice} />)

    await user.clear(screen.getByTestId('character-page-name-input'))
    await user.type(screen.getByTestId('character-page-name-input'), 'Alice Doe')
    await user.click(screen.getByTestId('character-page-save-button'))

    await waitFor(() => {
      expect(mockedUpdateCharacter).toHaveBeenCalledWith('story-1', '1', {
        name: 'Alice Doe',
        description: 'Une héroïne curieuse',
      })
    })
    expect(mockRouterPush).toHaveBeenCalledWith('/story/story-1')
  })

  it('navigates back without saving when cancelled', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage storyId="story-1" character={alice} />)

    await user.click(screen.getByTestId('character-page-cancel-button'))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/story-1')
    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })

  it('shows a validation error when clearing a required field', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage storyId="story-1" character={alice} />)

    await user.clear(screen.getByTestId('character-page-name-input'))
    await user.click(screen.getByTestId('character-page-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Name and description are required.')
    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })

  it('shows an error message when saving fails', async () => {
    mockedUpdateCharacter.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()

    render(<CharacterEditPage storyId="story-1" character={alice} />)

    await user.click(screen.getByTestId('character-page-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})
