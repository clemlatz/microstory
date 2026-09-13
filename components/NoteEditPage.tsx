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
 * for the shared rationale: title field doubling as the page heading, no
 * field labels, BlockNote content editor filling the viewport, autosave
 * instead of a save button, and now `StoryShell`'s title bar/navigation
 * drawer wrapping it too, with "Notes" highlighted).
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
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-6 py-6 sm:px-10">
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mb-4 flex items-center justify-between gap-4">
              <input
                data-testid="note-page-title-input"
                className="min-w-0 flex-1 border-none bg-transparent font-serif text-3xl text-stone-900 outline-none placeholder:text-stone-300 dark:text-stone-100 dark:placeholder:text-stone-600"
                placeholder={t('notes.titlePlaceholder')}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <span
                data-testid="note-page-save-status"
                className="shrink-0 font-sans text-sm text-stone-400 dark:text-stone-500"
              >
                {isSaving ? t('common.saving') : t('common.saved')}
              </span>
            </div>

            {error && (
              <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div data-testid="note-page-content-input" className="note-content-editor min-h-0 flex-1 overflow-y-auto">
              <NoteContentEditor initialMarkdown={note.content} onChangeMarkdown={setContent} />
            </div>
          </div>
        </div>
      </div>
    </StoryShell>
  )
}
