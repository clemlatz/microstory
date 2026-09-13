'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { updateStoryPresentation } from '@/lib/storiesApi'
import { StoryShell } from './StoryShell'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Story } from '@/lib/types'

const StoryPresentationEditor = dynamic(
  () => import('./StoryPresentationEditor').then((mod) => mod.StoryPresentationEditor),
  { ssr: false },
)

const AUTOSAVE_DELAY_MS = 800

/**
 * Notion-style dedicated page for editing a story's presentation text
 * (issue #1): a free-form synopsis/pitch/context field, shown and edited
 * separately from the story's title (unlike `CharacterEditPage`/
 * `NoteEditPage`, there is no name/title field here to double as the page
 * heading — the story's own title is shown read-only instead). Same
 * BlockNote content editor and debounced-autosave pattern as characters
 * and notes, and the same `StoryShell` title bar/navigation drawer
 * wrapping it, with "Aperçu" highlighted since the presentation lives on
 * the overview section.
 *
 * Unlike a character's name/description or a note's title/content, an
 * empty presentation is a valid, savable state (a story simply has none
 * yet) — so, unlike those pages' `persist`, this one has no
 * empty-content guard before saving.
 */
export function StoryPresentationEditPage({ story, llmWritingEnabled }: { story: Story; llmWritingEnabled: boolean }) {
  const { t } = useLocale()
  const router = useRouter()

  const [presentation, setPresentation] = useState(story.presentation)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isFirstRender = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function persist(nextPresentation: string) {
    setIsSaving(true)
    try {
      await updateStoryPresentation(story.id, nextPresentation.trim())
      setError(null)
    } catch (err) {
      console.error('Failed to save the story presentation', err)
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
      persist(presentation)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentation])

  function flushPendingSave() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      persist(presentation)
    }
  }

  return (
    <StoryShell
      story={story}
      llmWritingEnabled={llmWritingEnabled}
      activeSection="overview"
      onNavigate={(section) => {
        flushPendingSave()
        router.push(`/story/${story.id}?section=${section}`)
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
              <h1 className="min-w-0 truncate font-serif text-3xl text-stone-900 dark:text-stone-100">
                {story.title}
              </h1>
              <span
                data-testid="story-presentation-save-status"
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

            <div
              data-testid="story-presentation-content-input"
              className="story-presentation-editor min-h-0 flex-1 overflow-y-auto"
            >
              <StoryPresentationEditor initialMarkdown={story.presentation} onChangeMarkdown={setPresentation} />
            </div>
          </div>
        </div>
      </div>
    </StoryShell>
  )
}
