'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { renameStory, updateStoryPresentation } from '@/lib/storiesApi'
import { StoryShell } from './StoryShell'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Story } from '@/lib/types'

const StoryPresentationEditor = dynamic(
  () => import('./StoryPresentationEditor').then((mod) => mod.StoryPresentationEditor),
  { ssr: false },
)

const AUTOSAVE_DELAY_MS = 800

/**
 * Notion-style dedicated page for editing a story's title and presentation
 * text (issue #1, title editing added by issue #18): the title bar itself
 * (`entryTitle`/`onEntryTitleChange`, fed live into `StoryShell`) is the
 * editable title field — this page's body shows no separate title heading
 * or input, since showing the title both there and in the bar read as a
 * duplicated title. Same BlockNote content editor and debounced-autosave
 * pattern as characters and notes, and the same `StoryShell` title
 * bar/navigation drawer wrapping it, with "Aperçu" highlighted since the
 * presentation lives on the overview section.
 *
 * `persist` saves title and presentation together (mirroring
 * `CharacterEditPage`'s combined name/description save) via two API calls
 * run in parallel — `renameStory` and `updateStoryPresentation` — rather
 * than a single request, since `lib/storiesApi.ts` exposes them as
 * separate functions (also used independently by `StoriesView`). The
 * title is guarded against being empty (a story always has one, like a
 * character's name or a note's title); unlike those pages, the
 * presentation itself has no such guard — an empty presentation is a
 * valid, savable state.
 */
export function StoryPresentationEditPage({ story }: { story: Story }) {
  const { t } = useLocale()
  const router = useRouter()

  const [title, setTitle] = useState(story.title)
  const [presentation, setPresentation] = useState(story.presentation)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isFirstRender = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function persist(nextTitle: string, nextPresentation: string) {
    const trimmedTitle = nextTitle.trim()
    if (!trimmedTitle) return

    setIsSaving(true)
    try {
      await Promise.all([
        renameStory(story.id, trimmedTitle),
        updateStoryPresentation(story.id, nextPresentation.trim()),
      ])
      setError(null)
    } catch (err) {
      console.error('Failed to save the story', err)
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
      persist(title, presentation)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, presentation])

  function flushPendingSave() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      persist(title, presentation)
    }
  }

  return (
    <StoryShell
      story={story}
      activeSection="overview"
      entryTitle={title}
      onEntryTitleChange={setTitle}
      isSaving={isSaving}
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[700px] flex-col px-6 py-6 sm:px-10">
            {error && (
              <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div data-testid="story-presentation-content-input" className="story-presentation-editor">
              <StoryPresentationEditor initialMarkdown={story.presentation} onChangeMarkdown={setPresentation} />
            </div>
          </div>
        </div>
      </div>
    </StoryShell>
  )
}
