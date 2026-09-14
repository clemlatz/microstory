'use client'

import type { ReactNode } from 'react'
import {
  BlockColorsItem,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  TableColumnHeaderItem,
  TableRowHeaderItem,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  useExtensionState,
} from '@blocknote/react'
import type { SideMenuProps } from '@blocknote/react'
import { SideMenuExtension } from '@blocknote/core'

/**
 * Shared drag handle menu customization (issue #17): adds "Move up"/"Move
 * down" items to every BlockNote editor in the app (character, note,
 * documentation, story presentation), so blocks can be reordered without
 * relying on native drag-and-drop — which does not work reliably on mobile
 * touch devices, a known, still-open upstream BlockNote limitation
 * (github.com/TypeCellOS/BlockNote/issues/1693).
 *
 * The block a drag handle menu applies to isn't passed as a prop by
 * BlockNote — it's read from the `sideMenu` extension's own state via the
 * public `useExtensionState` hook (keyed by the extension's `"sideMenu"`
 * key), the same way BlockNote's own default drag handle menu items do
 * internally.
 *
 * `MoveUpItem`/`MoveDownItem` are built the same way as BlockNote's own
 * `RemoveBlockItem` (a `Components.Generic.Menu.Item` wired to an editor
 * action), since there's no built-in "move" menu item to reuse — unlike
 * `RemoveBlockItem`/`BlockColorsItem`/`TableRowHeaderItem`/
 * `TableColumnHeaderItem`, which are kept here to preserve the full
 * default menu (passing children to `DragHandleMenu` replaces the
 * defaults rather than extending them). Their labels are plain English
 * literals, matching how BlockNote's own default items already render
 * regardless of this app's locale setting (BlockNote isn't wired into
 * `lib/i18n`).
 */
function useSideMenuBlock() {
  return useExtensionState(SideMenuExtension, { selector: (state) => state?.block })
}

function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  const Components = useComponentsContext()
  if (!Components) return null

  return (
    <Components.Generic.Menu.Item className="bn-menu-item" onClick={onClick}>
      {children}
    </Components.Generic.Menu.Item>
  )
}

function MoveUpItem() {
  const editor = useBlockNoteEditor()
  const block = useSideMenuBlock()
  if (!block) return null

  return <MenuItem onClick={() => editor.moveBlocksUp(block.id)}>Move up</MenuItem>
}

function MoveDownItem() {
  const editor = useBlockNoteEditor()
  const block = useSideMenuBlock()
  if (!block) return null

  return <MenuItem onClick={() => editor.moveBlocksDown(block.id)}>Move down</MenuItem>
}

function CustomDragHandleMenu() {
  const dictionary = useDictionary()

  return (
    <DragHandleMenu>
      <MoveUpItem />
      <MoveDownItem />
      <RemoveBlockItem>{dictionary.drag_handle.delete_menuitem}</RemoveBlockItem>
      <BlockColorsItem>{dictionary.drag_handle.colors_menuitem}</BlockColorsItem>
      <TableRowHeaderItem>{dictionary.drag_handle.header_row_menuitem}</TableRowHeaderItem>
      <TableColumnHeaderItem>{dictionary.drag_handle.header_column_menuitem}</TableColumnHeaderItem>
    </DragHandleMenu>
  )
}

/**
 * Pass as the `sideMenu` prop to `SideMenuController`, itself rendered as a
 * child of a `BlockNoteView` with its own default side menu disabled
 * (`sideMenu={false}`), to wire `CustomDragHandleMenu` in while keeping
 * every other default side menu button (the "+" add-block button, the
 * drag handle itself) unchanged.
 */
export function BlockNoteSideMenu(props: SideMenuProps) {
  return <SideMenu {...props} dragHandleMenu={CustomDragHandleMenu} />
}
