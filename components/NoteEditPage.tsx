'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { updateNote } from '@/lib/notesApi'
import { StoryShell } from './StoryShell'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Note, Story } from '@/lib/types'

const NoteContentEditor = dynamic(() => import('./NoteContentEditor').then((mod) => mod.NoteContentEditor), {
  ssr: false,
})

const AUTOSAVE_DELAY_MS = 800

/**
 * Notion-style dedicated page for editing one note (issue #7, mirroring
 * the same change for characters — see `CharacterEditPage`'s doc comment
 * for the shared rationale: no field labels, BlockNote content editor
 * filling the viewport, autosave instead of a save button, and
 * `StoryShell`'s title bar/navigation drawer wrapping it, with "Notes"
 * highlighted, its own title bar doubling as the editable title field
 * (issue #18) rather than a separate heading in the page body).
 */
export function NoteEditPage({
  story,
  note,
  llmWritingEnabled,
}: {
  story: Story
  note: Note
  llmWritingEnabled: boolean
}) {
  const { t } = useLocale()
  const router = useRouter()
  const storyId = story.id

  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isFirstRender = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function persist(nextTitle: string, nextContent: string) {
    const trimmedTitle = nextTitle.trim()
    const trimmedContent = nextContent.trim()
    if (!trimmedTitle || !trimmedContent) return

    setIsSaving(true)
    try {
      await updateNote(storyId, note.id, { title: trimmedTitle, content: trimmedContent })
      setError(null)
    } catch (err) {
      console.error('Failed to save note', err)
      setError(err instanceof Error && err.message ? err.message : t('common.genericError'))
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      persist(title, content)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content])

  function flushPendingSave() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      persist(title, content)
    }
  }

  return (
    <StoryShell
      story={story}
      llmWritingEnabled={llmWritingEnabled}
      activeSection="notes"
      entryTitle={title}
      onEntryTitleChange={setTitle}
      entryTitlePlaceholder={t('notes.titlePlaceholder')}
      isSaving={isSaving}
      onNavigate={(section) => {
        flushPendingSave()
        router.push(`/story/${storyId}?section=${section}`)
      }}
      onBackToStories={() => {
        flushPendingSave()
        router.push('/stories')
      }}
    >
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-[#fdfbf6] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[700px] flex-col px-6 py-6 sm:px-10">
            {error && (
              <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div data-testid="note-page-content-input" className="note-content-editor">
              <NoteContentEditor initialMarkdown={note.content} onChangeMarkdown={setContent} />
            </div>
          </div>
        </div>
      </div>
    </StoryShell>
  )
}
