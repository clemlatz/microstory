'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StoryHomeView } from './StoryHomeView'
import { ChatWindow } from './ChatWindow'
import { StoryNavDrawer, type StorySection } from './StoryNavDrawer'
import type { Story } from '@/lib/types'

/**
 * Owns which section of a story is currently shown (issue #13, reworking
 * issue #74's simpler home/manuscript toggle): the knowledge-base sections
 * rendered by `StoryHomeView` (Overview, Characters, Notes, Documentation)
 * plus the manuscript/chat surface (`ChatWindow`) — a local `activeSection`
 * state rather than separate routes, so switching back and forth within a
 * single visit doesn't lose any section's in-progress state. Navigation
 * between sections (and back to the stories list) goes exclusively through
 * `StoryNavDrawer`, an overlay opened from either underlying view's header
 * button — it stays mounted here, above whichever view is showing, so a
 * single drawer instance serves every section.
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
  const [activeSection, setActiveSection] = useState<StorySection>('overview')
  const [isNavOpen, setIsNavOpen] = useState(false)

  const openNav = () => setIsNavOpen(true)
  const closeNav = () => setIsNavOpen(false)

  const handleNavigate = (section: StorySection) => {
    setActiveSection(section)
    closeNav()
  }

  return (
    <>
      {llmWritingEnabled && activeSection === 'manuscript' ? (
        <ChatWindow storyId={story.id} onOpenNav={openNav} />
      ) : (
        <StoryHomeView
          story={story}
          section={activeSection === 'manuscript' ? 'overview' : activeSection}
          onOpenNav={openNav}
        />
      )}
      <StoryNavDrawer
        open={isNavOpen}
        onClose={closeNav}
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onBackToStories={() => router.push('/stories')}
        llmWritingEnabled={llmWritingEnabled}
      />
    </>
  )
}
