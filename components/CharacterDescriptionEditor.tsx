'use client'

import { useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import '@blocknote/core/fonts/inter.css'

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
    <BlockNoteView editor={editor} onChange={() => onChangeMarkdown(editor.blocksToMarkdownLossy(editor.document))} />
  )
}
