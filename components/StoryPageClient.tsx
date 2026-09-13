'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { StoryHomeView } from './StoryHomeView'
import { ChatWindow } from './ChatWindow'
import { StoryNavDrawer, type StorySection } from './StoryNavDrawer'
import type { Story } from '@/lib/types'

// Matches the `md` breakpoint Tailwind (and `StoryNavDrawer`'s own `md:`
// classes) use by default — the point at which the nav switches from a
// mobile overlay to a persistent desktop sidebar.
const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'

function isDesktopViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DESKTOP_MEDIA_QUERY).matches
  )
}

/**
 * Tracks whether the viewport is currently desktop-width, hydration-safe:
 * `useSyncExternalStore` renders `getServerSnapshot`'s value (always
 * `false` — there's no `window` server-side) through the first client
 * render, then reconciles to the real value right after, exactly like
 * `LocaleContext`'s own locale detection does for the same reason. Also
 * reactive to the viewport crossing the breakpoint afterward (a resize),
 * unlike a one-off effect would be.
 */
function subscribeToDesktopViewport(callback: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mediaQueryList = window.matchMedia(DESKTOP_MEDIA_QUERY)
  mediaQueryList.addEventListener('change', callback)
  return () => mediaQueryList.removeEventListener('change', callback)
}

function getDesktopServerSnapshot(): boolean {
  return false
}

/**
 * Owns which section of a story is currently shown (issue #13, reworking
 * issue #74's simpler home/manuscript toggle): the knowledge-base sections
 * rendered by `StoryHomeView` (Overview, Characters, Notes, Documentation)
 * plus the manuscript/chat surface (`ChatWindow`) — a local `activeSection`
 * state rather than separate routes, so switching back and forth within a
 * single visit doesn't lose any section's in-progress state. Navigation
 * between sections (and back to the stories list) goes exclusively through
 * `StoryNavDrawer` — a single instance, mounted here as a sibling of
 * whichever view is showing, that renders itself either as a mobile overlay
 * or a persistent desktop sidebar (see its own doc comment).
 *
 * `isNavOpen` defaults to following the viewport (`isDesktop`, via
 * `useSyncExternalStore` above) until the user explicitly opens or closes
 * it (`navOverride`, `null` meaning "no explicit choice yet") — so the
 * sidebar is open by default on a desktop-width viewport and closed by
 * default on a narrower one, but once the user hides or shows it, that
 * choice sticks regardless of later viewport changes. `handleNavigate`
 * only auto-closes the nav on a narrower viewport, where it behaves as an
 * overlay that would otherwise cover the newly selected section — on
 * desktop it stays open across section changes.
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
  const [navOverride, setNavOverride] = useState<boolean | null>(null)
  const isDesktop = useSyncExternalStore(subscribeToDesktopViewport, isDesktopViewport, getDesktopServerSnapshot)
  const isNavOpen = navOverride ?? isDesktop

  const toggleNav = () => setNavOverride(!isNavOpen)
  const closeNav = () => setNavOverride(false)

  const handleNavigate = (section: StorySection) => {
    setActiveSection(section)
    if (!isDesktop) closeNav()
  }

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
        {llmWritingEnabled && activeSection === 'manuscript' ? (
          <ChatWindow storyId={story.id} onOpenNav={toggleNav} />
        ) : (
          <StoryHomeView
            story={story}
            section={activeSection === 'manuscript' ? 'overview' : activeSection}
            onOpenNav={toggleNav}
          />
        )}
      </div>
    </div>
  )
}
