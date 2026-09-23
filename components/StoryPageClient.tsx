'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { StoryHomeView } from './StoryHomeView'
import { StoryShell } from './StoryShell'
import type { StorySection } from './StoryNavDrawer'
import type { Story } from '@/lib/types'

const STORY_SECTIONS: StorySection[] = ['search', 'overview', 'characters', 'notes', 'documentation']

function isStorySection(value: string | null): value is StorySection {
  return value !== null && (STORY_SECTIONS as string[]).includes(value)
}

/**
 * Owns which section of a story is currently shown (issue #13): the
 * knowledge-base sections rendered by `StoryHomeView` (Overview,
 * Characters, Notes, Documentation) — a local `activeSection` state rather
 * than separate routes, so switching back and forth within a single visit
 * doesn't lose any section's in-progress state. Navigation between
 * sections (and back to the stories list) goes exclusively through
 * `StoryNavDrawer`, rendered by `StoryShell` (see its own doc comment).
 *
 * The initial section can be seeded from a `?section=` query param
 * (falling back to `'overview'` when it's absent or unrecognized) — read
 * once, via `useState`'s lazy initializer, not kept in sync afterward.
 * This is what lets a standalone edit page's drawer (`StoryShell`, used by
 * `CharacterEditPage`/`NoteEditPage`/`DocumentationEditPage`/
 * `StoryPresentationEditPage`) send the user back to the *matching*
 * section instead of always landing on the overview.
 */
export function StoryPageClient({ story }: { story: Story }) {
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<StorySection>(() => {
    const requested = searchParams.get('section')
    return isStorySection(requested) ? requested : 'overview'
  })

  return (
    <StoryShell story={story} activeSection={activeSection} onNavigate={setActiveSection}>
      <StoryHomeView story={story} section={activeSection} />
    </StoryShell>
  )
}
