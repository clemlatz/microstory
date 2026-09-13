'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CharactersPanel } from './CharactersPanel'
import { NotesPanel } from './NotesPanel'
import { DocumentationPanel } from './DocumentationPanel'
import { SearchPanel } from './SearchPanel'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Story } from '@/lib/types'

/**
 * The main view for a story (issue #74): its title and its character list
 * (full CRUD, via `CharactersPanel` — the same component that used to be the
 * config panel's "Personnages" tab, now hosted here instead since that tab
 * was redundant with this view). This is what `/story/[id]` shows by
 * default; the existing manuscript/chat writing surface (`ChatWindow`) is
 * reached via the "Manuscrit" button and becomes secondary, per the issue.
 *
 * Also hosts `NotesPanel` (issue #78) below the character list: free-form
 * title+content notes for anything that doesn't fit a structured entity
 * type, same load/add/edit/delete pattern as `CharactersPanel`.
 *
 * `DocumentationPanel` (issue #11) sits below `NotesPanel`: factual
 * reference material (research, sources) kept findable to preserve the
 * story world's credibility — unlike Notes' free-form personal framing,
 * and never auto-injected into any prompt.
 *
 * `onOpenManuscript` is optional (issue #83): omitting it (when LLM-assisted
 * writing is disabled via `LLM_WRITING_ENABLED=false`, see
 * `lib/llmWritingFlag.ts`) hides the "Manuscrit" button entirely, since
 * there would be nowhere left for it to lead.
 *
 * Also shows the story's presentation text (issue #1, a free-form
 * synopsis/pitch), right below the title — a read-only preview here, since
 * (like characters and notes) editing it happens on its own dedicated
 * Notion-style page (`/story/[id]/presentation`, `StoryPresentationEditPage`)
 * rather than inline in this view.
 *
 * `SearchPanel` (issue #12) sits above those three panels; while it reports
 * an active query (`onActiveChange`), the panels themselves are hidden —
 * showing both the search results and the full, unfiltered lists at once
 * was redundant and cluttered, and `SearchPanel` already covers all three
 * entity types on its own.
 */
export function StoryHomeView({
  story,
  onOpenManuscript,
}: {
  story: Story
  onOpenManuscript?: () => void
}) {
  const router = useRouter()
  const { t } = useLocale()
  const [isSearchActive, setIsSearchActive] = useState(false)

  return (
    <div className="h-full flex-1 overflow-y-auto bg-[#fdfbf6] px-6 py-10 text-stone-900 sm:px-10 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto w-full max-w-2xl">
        <button
          data-testid="stories-back-button"
          type="button"
          onClick={() => router.push('/stories')}
          className="mb-4 font-sans text-sm text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
        >
          {t('storyHome.back')}
        </button>

        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 data-testid="story-title" className="min-w-0 truncate font-serif text-3xl text-stone-900 dark:text-stone-100">
            {story.title}
          </h1>
          {onOpenManuscript && (
            <button
              data-testid="open-manuscript-button"
              type="button"
              onClick={onOpenManuscript}
              className="shrink-0 rounded-lg border border-[#e7e1d5] bg-[#fffdf8] px-3 py-1.5 font-sans text-sm text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              {t('storyHome.openManuscript')}
            </button>
          )}
        </div>

        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('presentation.title')}</h3>
            <button
              type="button"
              data-testid="story-presentation-edit-button"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              onClick={() => router.push(`/story/${story.id}/presentation`)}
            >
              {t('presentation.edit')}
            </button>
          </div>
          <p
            data-testid="story-presentation-preview"
            className="line-clamp-3 text-sm break-words whitespace-pre-line text-gray-600 dark:text-gray-400"
          >
            {story.presentation.trim() || t('presentation.empty')}
          </p>
        </div>

        <SearchPanel storyId={story.id} onActiveChange={setIsSearchActive} />

        {!isSearchActive && (
          <>
            <CharactersPanel storyId={story.id} />

            <div className="mt-8">
              <NotesPanel storyId={story.id} />
            </div>

            <div className="mt-8">
              <DocumentationPanel storyId={story.id} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
