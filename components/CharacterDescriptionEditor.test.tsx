import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { CharacterDescriptionEditor } from './CharacterDescriptionEditor'

// BlockNote/ProseMirror doesn't render in jsdom, and its own editing
// behavior is out of scope here (it's a third-party editor) — this test
// suite only verifies how this component wires markdown in and out of it.
// The mock editor tracks its "document" as a single markdown string,
// mirroring the real one's blocksToMarkdownLossy/tryParseMarkdownToBlocks
// round-trip.
let mockEditorContent = ''
const mockReplaceBlocks = vi.fn()
const mockTryParseMarkdownToBlocks = vi.fn((markdown: string) => {
  mockEditorContent = markdown
  return [markdown]
})
const mockBlocksToMarkdownLossy = vi.fn(() => mockEditorContent)

let capturedOnChange: (() => void) | undefined

vi.mock('@blocknote/react', () => ({
  useCreateBlockNote: () => ({
    document: [],
    replaceBlocks: mockReplaceBlocks,
    tryParseMarkdownToBlocks: mockTryParseMarkdownToBlocks,
    blocksToMarkdownLossy: mockBlocksToMarkdownLossy,
  }),
  // The "Move up"/"Move down" drag handle menu customization
  // (BlockNoteDragHandleMenu.tsx) is exercised by its own test, not here.
  SideMenuController: () => null,
}))

vi.mock('@blocknote/mantine', () => ({
  BlockNoteView: ({ onChange }: { onChange: () => void }) => {
    capturedOnChange = onChange
    return <div data-testid="blocknote-editor-stub" />
  },
}))

describe('CharacterDescriptionEditor', () => {
  beforeEach(() => {
    mockReplaceBlocks.mockClear()
    mockTryParseMarkdownToBlocks.mockClear()
    mockBlocksToMarkdownLossy.mockClear()
    mockEditorContent = ''
    capturedOnChange = undefined
  })

  it('loads the initial markdown into the editor on mount', async () => {
    render(<CharacterDescriptionEditor initialMarkdown="Une héroïne curieuse" onChangeMarkdown={vi.fn()} />)

    await waitFor(() => {
      expect(mockTryParseMarkdownToBlocks).toHaveBeenCalledWith('Une héroïne curieuse')
    })
    expect(mockReplaceBlocks).toHaveBeenCalled()
  })

  it('reports the current markdown whenever the editor content changes', async () => {
    const onChangeMarkdown = vi.fn()
    render(<CharacterDescriptionEditor initialMarkdown="Alice" onChangeMarkdown={onChangeMarkdown} />)
    await waitFor(() => expect(mockTryParseMarkdownToBlocks).toHaveBeenCalled())

    mockEditorContent = 'Alice, une héroïne'
    capturedOnChange?.()

    expect(onChangeMarkdown).toHaveBeenCalledWith('Alice, une héroïne')
  })
})
