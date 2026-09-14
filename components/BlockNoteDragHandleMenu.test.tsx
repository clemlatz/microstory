import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockMoveBlocksUp = vi.fn()
const mockMoveBlocksDown = vi.fn()
const mockEditor = { moveBlocksUp: mockMoveBlocksUp, moveBlocksDown: mockMoveBlocksDown }

let mockBlock: { id: string } | undefined = { id: 'block-1' }

vi.mock('@blocknote/core', () => ({
  SideMenuExtension: 'sideMenu-extension-key',
}))

vi.mock('@blocknote/react', () => ({
  useBlockNoteEditor: () => mockEditor,
  useComponentsContext: () => ({
    Generic: {
      Menu: {
        Item: ({
          onClick,
          children,
        }: {
          onClick: () => void
          children: React.ReactNode
        }) => (
          <button type="button" onClick={onClick}>
            {children}
          </button>
        ),
      },
    },
  }),
  useDictionary: () => ({
    drag_handle: {
      delete_menuitem: 'Delete',
      colors_menuitem: 'Colors',
      header_row_menuitem: 'Header row',
      header_column_menuitem: 'Header column',
    },
  }),
  useExtensionState: (_extension: unknown, { selector }: { selector: (state: unknown) => unknown }) =>
    selector({ block: mockBlock }),
  DragHandleMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RemoveBlockItem: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  BlockColorsItem: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TableRowHeaderItem: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TableColumnHeaderItem: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SideMenu: ({ dragHandleMenu: DragHandleMenuComponent }: { dragHandleMenu: React.ComponentType }) => (
    <DragHandleMenuComponent />
  ),
}))

import { BlockNoteSideMenu } from './BlockNoteDragHandleMenu'

describe('BlockNoteSideMenu', () => {
  beforeEach(() => {
    mockMoveBlocksUp.mockReset()
    mockMoveBlocksDown.mockReset()
    mockBlock = { id: 'block-1' }
  })

  it('moves the current block up when "Move up" is clicked', async () => {
    const user = userEvent.setup()
    render(<BlockNoteSideMenu />)

    await user.click(screen.getByText('Move up'))

    expect(mockMoveBlocksUp).toHaveBeenCalledWith('block-1')
  })

  it('moves the current block down when "Move down" is clicked', async () => {
    const user = userEvent.setup()
    render(<BlockNoteSideMenu />)

    await user.click(screen.getByText('Move down'))

    expect(mockMoveBlocksDown).toHaveBeenCalledWith('block-1')
  })

  it('still renders the default menu items alongside the new ones', () => {
    render(<BlockNoteSideMenu />)

    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Colors')).toBeInTheDocument()
  })

  it('does not render move buttons when there is no current block', () => {
    mockBlock = undefined
    render(<BlockNoteSideMenu />)

    expect(screen.queryByText('Move up')).not.toBeInTheDocument()
    expect(screen.queryByText('Move down')).not.toBeInTheDocument()
  })
})
