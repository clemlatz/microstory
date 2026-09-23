import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterEditPage } from './CharacterEditPage'
import type { Character, Story } from '@/lib/types'

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
// CharacterEditPage's own autosave/back/validation logic.
//
// Real timers throughout (not vi.useFakeTimers()): per this project's
// testing notes, React's own scheduler relies on setTimeout internally, so
// globally faked timers deadlock userEvent interactions that trigger a
// render. The debounce delay is short enough that waiting it out for real
// is cheap.
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

const story: Story = {
  id: 'story-1',
  title: 'Le Voyage de Nour',
  presentation: '',
  createdAt: 1000,
  updatedAt: 2000,
}

const WAIT_FOR_AUTOSAVE = { timeout: 2000 }

describe('CharacterEditPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockRouterPush.mockReset()
    mockedUpdateCharacter.mockReset()
    mockedUpdateCharacter.mockResolvedValue(alice)
  })

  it('shows the character name and description, with no save button', async () => {
    render(<CharacterEditPage story={story} character={alice} />)

    expect(screen.getByTestId('story-title')).toHaveValue('Alice')
    expect(await screen.findByTestId('character-description-editor-stub')).toHaveValue('Une héroïne curieuse')
    expect(screen.queryByTestId('character-page-save-button')).not.toBeInTheDocument()
  })

  it('shows the character name in the title bar instead of the story title, live as it is edited', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage story={story} character={alice} />)

    expect(screen.getByTestId('story-title')).toHaveValue('Alice')

    await user.type(screen.getByTestId('story-title'), ' Doe')
    expect(screen.getByTestId('story-title')).toHaveValue('Alice Doe')
  })

  it('autosaves a name change after the debounce delay', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage story={story} character={alice} />)

    await user.clear(screen.getByTestId('story-title'))
    await user.type(screen.getByTestId('story-title'), 'Alice Doe')
    expect(mockedUpdateCharacter).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(mockedUpdateCharacter).toHaveBeenCalledWith('story-1', '1', {
        name: 'Alice Doe',
        description: 'Une héroïne curieuse',
      })
    }, WAIT_FOR_AUTOSAVE)
    expect(mockedUpdateCharacter).toHaveBeenCalledTimes(1)
  })

  it('autosaves a description change after the debounce delay', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage story={story} character={alice} />)

    await user.clear(await screen.findByTestId('character-description-editor-stub'))
    await user.type(screen.getByTestId('character-description-editor-stub'), 'Une héroïne intrépide')

    await waitFor(() => {
      expect(mockedUpdateCharacter).toHaveBeenCalledWith('story-1', '1', {
        name: 'Alice',
        description: 'Une héroïne intrépide',
      })
    }, WAIT_FOR_AUTOSAVE)
  })

  it('flushes a pending save immediately when navigating back via the drawer', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage story={story} character={alice} />)

    await user.type(screen.getByTestId('story-title'), ' Doe')
    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-my-stories'))

    expect(mockedUpdateCharacter).toHaveBeenCalledWith('story-1', '1', {
      name: 'Alice Doe',
      description: 'Une héroïne curieuse',
    })
    expect(mockRouterPush).toHaveBeenCalledWith('/stories')
  })

  it('navigates back without saving when nothing changed', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage story={story} character={alice} />)

    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-my-stories'))

    expect(mockRouterPush).toHaveBeenCalledWith('/stories')
    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })

  it('does not autosave while the name is empty', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage story={story} character={alice} />)

    await user.clear(screen.getByTestId('story-title'))
    // No positive assertion can prove a debounced call never fires without
    // waiting past its delay — wait it out, then assert nothing happened.
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })

  it('does not autosave while the description is empty', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage story={story} character={alice} />)

    await user.clear(await screen.findByTestId('character-description-editor-stub'))
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })

  it('shows an error message when autosaving fails', async () => {
    mockedUpdateCharacter.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<CharacterEditPage story={story} character={alice} />)

    await user.type(screen.getByTestId('story-title'), ' Doe')

    expect(await screen.findByRole('alert', {}, WAIT_FOR_AUTOSAVE)).toHaveTextContent('boom')
  })
})
