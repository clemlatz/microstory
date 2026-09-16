'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StoryHomeView } from './StoryHomeView'
import { StoryShell } from './StoryShell'
import { ChatWindow } from './ChatWindow'
import { StoryNavDrawer, type StorySection } from './StoryNavDrawer'
import { useStoryNavOpen } from '@/lib/useStoryNavOpen'
import type { Story } from '@/lib/types'

const STORY_SECTIONS: StorySection[] = ['search', 'overview', 'characters', 'notes', 'documentation', 'manuscript']

function isStorySection(value: string | null): value is StorySection {
  return value !== null && (STORY_SECTIONS as string[]).includes(value)
}

/**
 * Owns which section of a story is currently shown (issue #13, reworking
 * issue #74's simpler home/manuscript toggle): the knowledge-base sections
 * rendered by `StoryHomeView` (Overview, Characters, Notes, Documentation)
 * plus the manuscript/chat surface (`ChatWindow`) — a local `activeSection`
 * state rather than separate routes, so switching back and forth within a
 * single visit doesn't lose any section's in-progress state. Navigation
 * between sections (and back to the stories list) goes exclusively through
 * `StoryNavDrawer` — a single instance, rendered here directly for the
 * manuscript view, or via `StoryShell` for every other section (see its own
 * doc comment) — that renders itself either as a mobile overlay or a
 * persistent desktop sidebar (see `StoryNavDrawer`'s own doc comment).
 *
 * The initial section can be seeded from a `?section=` query param (falling
 * back to `'overview'` when it's absent, unrecognized, or `'manuscript'`
 * while `llmWritingEnabled` is false) — read once, via `useState`'s lazy
 * initializer, not kept in sync afterward. This is what lets a standalone
 * edit page's drawer (`StoryShell`, used by
 * `CharacterEditPage`/`NoteEditPage`/`DocumentationEditPage`/
 * `StoryPresentationEditPage`) send the user back to the *matching* section
 * instead of always landing on the overview.
 *
 * `llmWritingEnabled` (issue #83) gates the manuscript entirely: when
 * false, `activeSection` can never actually reach `'manuscript'`
 * (`StoryNavDrawer` hides that item, and `ChatWindow` is simply never
 * rendered), so the manuscript/chat surface and its writing/LLM config
 * panel stay unreachable.
 */
export function StoryPageClient({
  story,
  llmWritingEnabled,
}: {
  story: Story
  llmWritingEnabled: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<StorySection>(() => {
    const requested = searchParams.get('section')
    if (!isStorySection(requested)) return 'overview'
    if (requested === 'manuscript' && !llmWritingEnabled) return 'overview'
    return requested
  })
  const { isNavOpen, isDesktop, toggleNav, closeNav } = useStoryNavOpen()

  const handleNavigate = (section: StorySection) => {
    setActiveSection(section)
    if (!isDesktop) closeNav()
  }

  if (llmWritingEnabled && activeSection === 'manuscript') {
    return (
      <div className="flex h-dvh w-full overflow-hidden">
        <StoryNavDrawer
          open={isNavOpen}
          onClose={closeNav}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onBackToStories={() => router.push('/stories')}
          llmWritingEnabled={llmWritingEnabled}
        />
        <div className="min-w-0 flex-1">
          <ChatWindow storyId={story.id} onOpenNav={toggleNav} />
        </div>
      </div>
    )
  }

  return (
    <StoryShell story={story} llmWritingEnabled={llmWritingEnabled} activeSection={activeSection} onNavigate={setActiveSection}>
      <StoryHomeView story={story} section={activeSection === 'manuscript' ? 'overview' : activeSection} />
    </StoryShell>
  )
}
