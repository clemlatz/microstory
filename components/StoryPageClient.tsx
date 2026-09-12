'use client'

import { useState } from 'react'
import { StoryHomeView } from './StoryHomeView'
import { ChatWindow } from './ChatWindow'
import type { Story } from '@/lib/types'

/**
 * Owns which of the two main views for a story is currently shown (issue
 * #74): the "Histoire" overview (title + characters, default) or the
 * "Manuscrit" writing surface (`ChatWindow`, now secondary) — a simple local
 * toggle rather than separate routes, so switching back and forth doesn't
 * lose either view's in-progress state within a single visit.
 *
 * `llmWritingEnabled` (issue #83) gates the manuscript entirely: when false,
 * `view` can never actually reach `'manuscript'` (`onOpenManuscript` is
 * simply not passed down — see `StoryHomeView`, which then also hides its
 * own "Manuscrit" button), so `ChatWindow` — and with it the chat/manuscript
 * surface and its writing/LLM config panel sections — stays unreachable.
 */
export function StoryPageClient({
  story,
  llmWritingEnabled,
}: {
  story: Story
  llmWritingEnabled: boolean
}) {
  const [view, setView] = useState<'home' | 'manuscript'>('home')

  if (llmWritingEnabled && view === 'manuscript') {
    return <ChatWindow storyId={story.id} onBackToOverview={() => setView('home')} />
  }

  return (
    <StoryHomeView
      story={story}
      onOpenManuscript={llmWritingEnabled ? () => setView('manuscript') : undefined}
    />
  )
}
