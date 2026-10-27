'use client'

import { useSyncExternalStore } from 'react'
import type { RecentEntityKind } from './recentEntities'

// Which entry sections (characters, notes, documentation) are unfolded in the
// navigation drawer. Remembered per-browser (`localStorage`) and per story, so
// the drawer — which remounts on every page change — comes back as it was left.
const storageKey = (storyId: string) => `microstory_nav_expanded_${storyId}`

const KINDS: RecentEntityKind[] = ['character', 'note', 'documentation']
const EMPTY: RecentEntityKind[] = []

let listeners: Array<() => void> = []

// `useSyncExternalStore` needs a referentially stable snapshot while nothing
// changed, so the parsed list is cached by its raw JSON string.
const cache = new Map<string, { raw: string | null; parsed: RecentEntityKind[] }>()

function readRaw(storyId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(storyId))
  } catch {
    // Storage can throw (private browsing, blocked site data): nothing remembered.
    return null
  }
}

function getSnapshot(storyId: string): RecentEntityKind[] {
  const raw = readRaw(storyId)
  const cached = cache.get(storyId)
  if (cached && cached.raw === raw) return cached.parsed

  let parsed = EMPTY
  if (raw) {
    try {
      const value: unknown = JSON.parse(raw)
      if (Array.isArray(value)) parsed = value.filter((v): v is RecentEntityKind => KINDS.includes(v))
    } catch {
      // Corrupted value: treat as nothing unfolded.
    }
  }
  cache.set(storyId, { raw, parsed })
  return parsed
}

function subscribe(callback: () => void) {
  listeners = [...listeners, callback]
  return () => {
    listeners = listeners.filter((listener) => listener !== callback)
  }
}

/** Unfolds or folds one section of the story's navigation drawer. */
export function setNavSectionExpanded(storyId: string, kind: RecentEntityKind, expanded: boolean) {
  const current = getSnapshot(storyId)
  if (current.includes(kind) === expanded) return
  const next = expanded ? [...current, kind] : current.filter((k) => k !== kind)
  try {
    window.localStorage.setItem(storageKey(storyId), JSON.stringify(next))
  } catch {
    // Non-fatal: the choice just won't survive a reload in this browser.
  }
  for (const listener of listeners) listener()
}

/** The sections currently unfolded in the story's navigation drawer. */
export function useExpandedNavSections(storyId: string | undefined): RecentEntityKind[] {
  return useSyncExternalStore(
    subscribe,
    () => (storyId ? getSnapshot(storyId) : EMPTY),
    () => EMPTY,
  )
}
