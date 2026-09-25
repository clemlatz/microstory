'use client'

import { useEffect, useSyncExternalStore } from 'react'

export type RecentEntityKind = 'character' | 'note' | 'documentation'

export type RecentEntity = {
  kind: RecentEntityKind
  id: string
  title: string
}

export const MAX_RECENT_ENTITIES = 10

const KINDS: RecentEntityKind[] = ['character', 'note', 'documentation']

// Remembered per-browser (`localStorage`), scoped per story — the same
// tradeoff `useStoryNavOpen` makes: survives a reload here, isn't synced
// across devices.
const storageKey = (storyId: string) => `microstory_recent_entities_${storyId}`

const EMPTY: RecentEntity[] = []

let listeners: Array<() => void> = []

// `useSyncExternalStore` needs a referentially stable snapshot while nothing
// changed, so the parsed list is cached by its raw JSON string.
const cache = new Map<string, { raw: string | null; parsed: RecentEntity[] }>()

function isRecentEntity(value: unknown): value is RecentEntity {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    KINDS.includes(candidate.kind as RecentEntityKind)
  )
}

function readRaw(storyId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(storyId))
  } catch {
    // Storage can throw (private browsing, blocked site data) — no history.
    return null
  }
}

function getSnapshot(storyId: string): RecentEntity[] {
  const raw = readRaw(storyId)
  const cached = cache.get(storyId)
  if (cached && cached.raw === raw) return cached.parsed

  let parsed = EMPTY
  if (raw) {
    try {
      const value: unknown = JSON.parse(raw)
      if (Array.isArray(value)) parsed = value.filter(isRecentEntity).slice(0, MAX_RECENT_ENTITIES)
    } catch {
      // Corrupted value: treat as empty.
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

function writeSnapshot(storyId: string, next: RecentEntity[]) {
  try {
    window.localStorage.setItem(storageKey(storyId), JSON.stringify(next))
  } catch {
    // Non-fatal: the history just won't survive a reload in this browser.
  }
  for (const listener of listeners) listener()
}

/** Removes a deleted entity from the story's history. */
export function forgetRecentEntity(storyId: string, kind: RecentEntityKind, id: string) {
  writeSnapshot(
    storyId,
    getSnapshot(storyId).filter((e) => !(e.kind === kind && e.id === id)),
  )
}

/** Puts `entity` first in the story's history, dropping any earlier copy and anything past the 10th. */
export function recordRecentEntity(storyId: string, entity: RecentEntity) {
  writeSnapshot(
    storyId,
    [entity, ...getSnapshot(storyId).filter((e) => !(e.kind === entity.kind && e.id === entity.id))].slice(
      0,
      MAX_RECENT_ENTITIES,
    ),
  )
}

/** The story's most recently viewed entities, most recent first. */
export function useRecentEntities(storyId: string | undefined): RecentEntity[] {
  return useSyncExternalStore(
    subscribe,
    () => (storyId ? getSnapshot(storyId) : EMPTY),
    () => EMPTY,
  )
}

/** Records the entity as viewed on mount, and refreshes its stored title when it's renamed. */
export function useRecordRecentEntity(storyId: string, entity: RecentEntity | undefined) {
  const kind = entity?.kind
  const id = entity?.id
  const title = entity?.title.trim()
  useEffect(() => {
    if (!kind || !id || !title) return
    recordRecentEntity(storyId, { kind, id, title })
  }, [storyId, kind, id, title])
}
