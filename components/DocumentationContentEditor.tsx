'use client'

import { useEffect, useRef } from 'react'
import { useCreateBlockNote, SideMenuController } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import '@blocknote/core/fonts/inter.css'
import { BlockNoteSideMenu } from './BlockNoteDragHandleMenu'

/**
 * The BlockNote block editor used by `DocumentationEditPage`'s content
 * field — identical setup to `NoteContentEditor`, split into its own file
 * for the same reason (BlockNote/ProseMirror reads `window` on creation and
 * therefore cannot render during Next.js's server-side render;
 * `DocumentationEditPage` loads this component via `next/dynamic` with
 * `ssr: false`).
 *
 * Its background/gutter overrides live in `app/globals.css` under
 * `.documentation-content-editor`, not here — see that file's comment (and
 * `NoteContentEditor`'s) for why.
 *
 * The default side menu is disabled (`sideMenu={false}`) and replaced by
 * `BlockNoteSideMenu` via `SideMenuController` (issue #17) — see
 * `BlockNoteDragHandleMenu.tsx`.
 */
export function DocumentationContentEditor({
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
