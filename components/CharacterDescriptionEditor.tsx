'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
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
      onChange={() => onChangeMarkdown(editor.blocksToMarkdownLossy(editor.document))}
      // Overridden as an inline style, not a CSS rule, because BlockNoteView's
      // own root element (.bn-root) redeclares this variable itself — a rule
      // on an ancestor would otherwise be shadowed by that declaration.
      style={{ '--bn-colors-editor-background': 'transparent' } as CSSProperties}
    />
  )
}
