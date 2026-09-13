'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CharactersPanel } from './CharactersPanel'
import { NotesPanel } from './NotesPanel'
import { DocumentationPanel } from './DocumentationPanel'
import { SearchPanel } from './SearchPanel'
import type { StorySection } from './StoryNavDrawer'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Story } from '@/lib/types'

/**
 * The knowledge-base shell for a story (issue #74, reworked by issue #13):
 * renders exactly one of its sections at a time — Overview (title +
 * presentation preview), Characters, Notes, or Documentation — driven by
 * the `section` prop `StoryPageClient` owns. Navigating between sections
 * (and to the manuscript, or back to the stories list) happens through
 * `StoryNavDrawer`, toggled open/closed via the `onOpenNav` header button
 * (a persistent sidebar on desktop, an overlay on narrower viewports — see
 * `StoryNavDrawer`'s own doc comment); the ad hoc
 * `stories-back-button`/`open-manuscript-button` this view used to render
 * itself are gone, superseded by that drawer.
 *
 * `SearchPanel` (issue #12) stays persistent above the active section
 * regardless of which one is showing: while it reports an active query
 * (`onActiveChange`), the section content is hidden and the search results
 * show in its place — showing both at once was redundant and cluttered,
 * and `SearchPanel` already covers all three entity types on its own.
 *
 * The story's presentation text (issue #1, a free-form synopsis/pitch) is
 * shown read-only here, as part of the Overview section — editing it
 * happens on its own dedicated Notion-style page
 * (`/story/[id]/presentation`, `StoryPresentationEditPage`).
 */
export function StoryHomeView({
  story,
  section,
  onOpenNav,
}: {
  story: Story
  section: StorySection
  onOpenNav: () => void
}) {
  const router = useRouter()
  const { t } = useLocale()
  const [isSearchActive, setIsSearchActive] = useState(false)

  return (
    <div className="h-full flex-1 overflow-y-auto bg-[#fdfbf6] px-6 py-10 text-stone-900 sm:px-10 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <button
            data-testid="story-nav-toggle"
            type="button"
            aria-label={t('chatWindow.navAria')}
            onClick={onOpenNav}
            className="shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-stone-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 data-testid="story-title" className="min-w-0 truncate font-serif text-3xl text-stone-900 dark:text-stone-100">
            {story.title}
          </h1>
        </div>

        <SearchPanel storyId={story.id} onActiveChange={setIsSearchActive} />

        {!isSearchActive && (
          <>
            {section === 'overview' && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {t('presentation.title')}
                  </h3>
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
                  className="text-sm break-words whitespace-pre-line text-gray-600 dark:text-gray-400"
                >
                  {story.presentation.trim() || t('presentation.empty')}
                </p>
              </div>
            )}

            {section === 'characters' && <CharactersPanel storyId={story.id} />}

            {section === 'notes' && <NotesPanel storyId={story.id} />}

            {section === 'documentation' && <DocumentationPanel storyId={story.id} />}
          </>
        )}
      </div>
    </div>
  )
}
