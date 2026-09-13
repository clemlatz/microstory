'use client'

import { useRouter } from 'next/navigation'
import { StoryTitleBar } from './StoryTitleBar'
import { StoryNavDrawer, type StorySection } from './StoryNavDrawer'
import { useStoryNavOpen } from '@/lib/useStoryNavOpen'
import type { Story } from '@/lib/types'

/**
 * The shared app shell for every story surface other than the manuscript
 * (`StoryPageClient`'s own `overview`/`characters`/`notes`/`documentation`
 * render, and each entity's dedicated edit page —
 * `CharacterEditPage`/`NoteEditPage`/`DocumentationEditPage`/
 * `StoryPresentationEditPage`): a full window-width `StoryTitleBar` above a
 * row holding `StoryNavDrawer` and the content passed as `children`. Pulled
 * out of `StoryPageClient` so every one of those pages — most of them their
 * own routes, not nested under `StoryPageClient`'s local section state — gets
 * the exact same title bar/drawer, rather than each re-implementing (or
 * omitting) it.
 *
 * The manuscript view is the one exception: it keeps `ChatWindow`'s own
 * separate header instead of this shell (see `StoryPageClient`).
 *
 * `activeSection` and `onNavigate` are owned by the caller: `StoryPageClient`
 * passes its local section state directly (no navigation, just a state
 * flip); a standalone edit page instead passes the section its entity
 * belongs to (so the matching drawer item is highlighted) and an
 * `onNavigate` that does a real `router.push` back to `/story/[id]`, since
 * there's no local section state to flip from a different route.
 * `onBackToStories` defaults to pushing to `/stories`, overridable when a
 * caller needs to run something first (flushing a pending autosave, for
 * instance).
 */
export function StoryShell({
  story,
  llmWritingEnabled,
  activeSection,
  onNavigate,
  onBackToStories,
  children,
}: {
  story: Story
  llmWritingEnabled: boolean
  activeSection: StorySection
  onNavigate: (section: StorySection) => void
  onBackToStories?: () => void
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isNavOpen, isDesktop, toggleNav, closeNav } = useStoryNavOpen()

  function handleNavigate(section: StorySection) {
    onNavigate(section)
    if (!isDesktop) closeNav()
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <StoryTitleBar title={story.title} onOpenNav={toggleNav} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <StoryNavDrawer
          open={isNavOpen}
          onClose={closeNav}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onBackToStories={onBackToStories ?? (() => router.push('/stories'))}
          llmWritingEnabled={llmWritingEnabled}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
