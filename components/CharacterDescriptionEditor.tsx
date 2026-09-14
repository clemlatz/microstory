'use client'

import { useEffect, useRef } from 'react'
import { useCreateBlockNote, SideMenuController } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import '@blocknote/core/fonts/inter.css'
import { BlockNoteSideMenu } from './BlockNoteDragHandleMenu'

/**
 * The BlockNote block editor used by `CharacterEditPage`'s description
 * field, split into its own file because BlockNote/ProseMirror reads
 * `window` on creation and therefore cannot render during Next.js's
 * server-side render — `CharacterEditPage` loads this component via
 * `next/dynamic` with `ssr: false`.
 *
 * Its background/gutter overrides (blending into the page, aligning with
 * the title above it) live in `app/globals.css` under
 * `.character-description-editor`, not here — see that file's comment for
 * why (`.bn-root`, where BlockNote itself declares its color variables, is
 * a separate portal-rendered element this component has no direct handle
 * on).
 *
 * The default side menu is disabled (`sideMenu={false}`) and replaced by
 * `BlockNoteSideMenu` via `SideMenuController` (issue #17), which adds
 * "Move up"/"Move down" items to the drag handle menu — see
 * `BlockNoteDragHandleMenu.tsx` for why (mobile drag-and-drop doesn't work
 * reliably on BlockNote, upstream).
 */
export function CharacterDescriptionEditor({
  initialMarkdown,
  onChangeMarkdown,
}: {
  initialMarkdown: string
  onChangeMarkdown: (markdown: string) => void
}) {
  const editor = useCreateBlockNote()
  const hasLoadedInitialContent = useRef(false)

  useEffect(() => {
    if (hasLoadedInitialContent.current) return
    hasLoadedInitialContent.current = true

    const blocks = editor.tryParseMarkdownToBlocks(initialMarkdown)
    editor.replaceBlocks(editor.document, blocks)
  }, [editor, initialMarkdown])

  return (
    <BlockNoteView
      editor={editor}
      sideMenu={false}
      onChange={() => onChangeMarkdown(editor.blocksToMarkdownLossy(editor.document))}
    >
      <SideMenuController sideMenu={BlockNoteSideMenu} />
    </BlockNoteView>
  )
}
