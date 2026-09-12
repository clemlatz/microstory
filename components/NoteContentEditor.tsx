'use client'

import { useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import '@blocknote/core/fonts/inter.css'

/**
 * The BlockNote block editor used by `NoteEditPage`'s content field —
 * identical setup to `CharacterDescriptionEditor`, split into its own file
 * for the same reason (BlockNote/ProseMirror reads `window` on creation
 * and therefore cannot render during Next.js's server-side render;
 * `NoteEditPage` loads this component via `next/dynamic` with `ssr:
 * false`).
 *
 * Its background/gutter overrides live in `app/globals.css` under
 * `.note-content-editor`, not here — see that file's comment (and
 * `CharacterDescriptionEditor`'s) for why.
 */
export function NoteContentEditor({
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
    <BlockNoteView editor={editor} onChange={() => onChangeMarkdown(editor.blocksToMarkdownLossy(editor.document))} />
  )
}
