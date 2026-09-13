'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { updateDocumentationEntry } from '@/lib/documentationApi'
import { StoryShell } from './StoryShell'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { DocumentationEntry, Story } from '@/lib/types'

const DocumentationContentEditor = dynamic(
  () => import('./DocumentationContentEditor').then((mod) => mod.DocumentationContentEditor),
  { ssr: false },
)

const AUTOSAVE_DELAY_MS = 800

/**
 * Notion-style dedicated page for editing one documentation entry (issue
 * #11), mirroring `NoteEditPage` exactly (title field doubling as the page
 * heading, BlockNote content editor filling the viewport, autosave instead
 * of a save button, `StoryShell`'s title bar/navigation drawer wrapping it
 * with "Documentation" highlighted) with one addition: an optional source
 * URL field below the title.
 */
export function DocumentationEditPage({
  story,
  entry,
  llmWritingEnabled,
}: {
  story: Story
  entry: DocumentationEntry
  llmWritingEnabled: boolean
}) {
  const { t } = useLocale()
  const router = useRouter()
  const storyId = story.id

  const [title, setTitle] = useState(entry.title)
  const [url, setUrl] = useState(entry.url ?? '')
  const [content, setContent] = useState(entry.content)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isFirstRender = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function persist(nextTitle: string, nextUrl: string, nextContent: string) {
    const trimmedTitle = nextTitle.trim()
    const trimmedContent = nextContent.trim()
    if (!trimmedTitle || !trimmedContent) return

    setIsSaving(true)
    try {
      await updateDocumentationEntry(storyId, entry.id, {
        title: trimmedTitle,
        content: trimmedContent,
        url: nextUrl.trim(),
      })
      setError(null)
    } catch (err) {
      console.error('Failed to save documentation entry', err)
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
      persist(title, url, content)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, url, content])

  function flushPendingSave() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      persist(title, url, content)
    }
  }

  function goBackToStory() {
    flushPendingSave()
    router.push(`/story/${storyId}`)
  }

  return (
    <StoryShell
      story={story}
      llmWritingEnabled={llmWritingEnabled}
      activeSection="documentation"
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
          <button
            data-testid="documentation-back-button"
            type="button"
            onClick={goBackToStory}
            className="mb-4 self-start font-sans text-sm text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
          >
            {t('storyHome.back')}
          </button>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mb-2 flex items-center justify-between gap-4">
              <input
                data-testid="documentation-page-title-input"
                className="min-w-0 flex-1 border-none bg-transparent font-serif text-3xl text-stone-900 outline-none placeholder:text-stone-300 dark:text-stone-100 dark:placeholder:text-stone-600"
                placeholder={t('documentation.titlePlaceholder')}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <span
                data-testid="documentation-page-save-status"
                className="shrink-0 font-sans text-sm text-stone-400 dark:text-stone-500"
              >
                {isSaving ? t('common.saving') : t('common.saved')}
              </span>
            </div>

            <input
              data-testid="documentation-page-url-input"
              className="mb-4 border-none bg-transparent font-sans text-sm text-stone-500 outline-none placeholder:text-stone-300 dark:text-stone-400 dark:placeholder:text-stone-600"
              placeholder={t('documentation.urlPlaceholder')}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />

            {error && (
              <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div
              data-testid="documentation-page-content-input"
              className="documentation-content-editor min-h-0 flex-1 overflow-y-auto"
            >
              <DocumentationContentEditor initialMarkdown={entry.content} onChangeMarkdown={setContent} />
            </div>
          </div>
        </div>
      </div>
    </StoryShell>
  )
}
