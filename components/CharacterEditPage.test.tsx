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

// BlockNote/ProseMirror doesn't render in jsdom, and its own behavior is
// out of scope here (it's a third-party editor) — this test suite only
// verifies how CharacterEditPage wires markdown in and out of it. The mock
// editor tracks its "document" as a single markdown string, mirroring the
// real one's blocksToMarkdownLossy/tryParseMarkdownToBlocks round-trip.
let mockEditorContent = ''
const mockReplaceBlocks = vi.fn()
const mockTryParseMarkdownToBlocks = vi.fn((markdown: string) => {
  mockEditorContent = markdown
  return [markdown]
})
const mockBlocksToMarkdownLossy = vi.fn(() => mockEditorContent)

vi.mock('@blocknote/react', () => ({
  useCreateBlockNote: () => ({
    document: [],
    replaceBlocks: mockReplaceBlocks,
    tryParseMarkdownToBlocks: mockTryParseMarkdownToBlocks,
    blocksToMarkdownLossy: mockBlocksToMarkdownLossy,
  }),
}))

vi.mock('@blocknote/mantine', () => ({
  BlockNoteView: () => <div data-testid="blocknote-editor-stub" />,
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
    mockReplaceBlocks.mockClear()
    mockTryParseMarkdownToBlocks.mockClear()
    mockBlocksToMarkdownLossy.mockClear()
    mockEditorContent = ''
  })

  it('loads the character description into the editor as markdown', async () => {
    render(<CharacterEditPage storyId="story-1" character={alice} />)

    await waitFor(() => {
      expect(mockTryParseMarkdownToBlocks).toHaveBeenCalledWith('Une héroïne curieuse')
    })
    expect(mockReplaceBlocks).toHaveBeenCalled()
  })

  it('shows the character name in the name field', () => {
    render(<CharacterEditPage storyId="story-1" character={alice} />)

    expect(screen.getByTestId('character-page-name-input')).toHaveValue('Alice')
  })

  it('saves the changes and navigates back to the story home', async () => {
    mockedUpdateCharacter.mockResolvedValue({ ...alice, name: 'Alice Doe', updatedAt: 2000 })
    const user = userEvent.setup()

    render(<CharacterEditPage storyId="story-1" character={alice} />)
    await waitFor(() => expect(mockTryParseMarkdownToBlocks).toHaveBeenCalled())

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

  it('shows a validation error when the name is cleared', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage storyId="story-1" character={alice} />)
    await waitFor(() => expect(mockTryParseMarkdownToBlocks).toHaveBeenCalled())

    await user.clear(screen.getByTestId('character-page-name-input'))
    await user.click(screen.getByTestId('character-page-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Name and description are required.')
    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })

  it('shows a validation error when the description is emptied', async () => {
    const user = userEvent.setup()
    render(<CharacterEditPage storyId="story-1" character={alice} />)
    await waitFor(() => expect(mockTryParseMarkdownToBlocks).toHaveBeenCalled())
    mockEditorContent = ''

    await user.click(screen.getByTestId('character-page-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Name and description are required.')
    expect(mockedUpdateCharacter).not.toHaveBeenCalled()
  })

  it('shows an error message when saving fails', async () => {
    mockedUpdateCharacter.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()

    render(<CharacterEditPage storyId="story-1" character={alice} />)
    await waitFor(() => expect(mockTryParseMarkdownToBlocks).toHaveBeenCalled())

    await user.click(screen.getByTestId('character-page-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})
