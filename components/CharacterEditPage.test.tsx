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

// The real BlockNote editor is covered by CharacterDescriptionEditor's own
// tests; here it's stubbed as a plain textarea driven by the same
// initialMarkdown/onChangeMarkdown contract, so this suite only exercises
// CharacterEditPage's own save/cancel/validation logic.
vi.mock('./CharacterDescriptionEditor', () => ({
  CharacterDescriptionEditor: ({
    initialMarkdown,
    onChangeMarkdown,
  }: {
    initialMarkdown: string
    onChangeMarkdown: (markdown: string) => void
  }) => (
    <textarea
      data-testid="character-description-editor-stub"
      defaultValue={initialMarkdown}
      onChange={(event) => onChangeMarkdown(event.target.value)}
    />
  ),
}))

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

  it('shows the character name and description', async () => {
    render(<CharacterEditPage storyId="story-1" character={alice} />)

    expect(screen.getByTestId('character-page-name-input')).toHaveValue('Alice')
    expect(await screen.findByTestId('character-description-editor-stub')).toHaveValue('Une héroïne curieuse')
  })

  it('saves the changes and navigates back to the story home', async () => {
    mockedUpdateCharacter.mockResolvedValue({ ...alice, name: 'Alice Doe', updatedAt: 2000 })
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

  it('saves an edited description', async () => {
    mockedUpdateCharacter.mockResolvedValue(alice)
    const user = userEvent.setup()

    render(<CharacterEditPage storyId="story-1" character={alice} />)

    await user.clear(await screen.findByTestId('character-description-editor-stub'))
    await user.type(screen.getByTestId('character-description-editor-stub'), 'Une héroïne intrépide')
    await user.click(screen.getByTestId('character-page-save-button'))

    await waitFor(() => {
      expect(mockedUpdateCharacter).toHaveBeenCalledWith('story-1', '1', {
        name: 'Alice',
        description: 'Une héroïne intrépide',
      })
    })
  })

  it('navigates back without saving when cancelled', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage storyId="story-1" character={alice} />)

    await user.click(screen.getByTestId('character-page-cancel-button'))

    expect(mockRouterPush).toHaveBeenCalledWith('/story/story-1')
    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })

  it('shows a validation error when the name is cleared', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage storyId="story-1" character={alice} />)

    await user.clear(screen.getByTestId('character-page-name-input'))
    await user.click(screen.getByTestId('character-page-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Name and description are required.')
    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })

  it('shows a validation error when the description is emptied', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage storyId="story-1" character={alice} />)

    await user.clear(await screen.findByTestId('character-description-editor-stub'))
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
