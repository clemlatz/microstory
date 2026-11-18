import type { RecentEntityKind } from './recentEntities'

// Remembers which entry was just opened from the "Recently viewed" list, so the
// drawer keeps highlighting it there instead of in its own section. Module-level
// on purpose: the drawer remounts on every page change, but client-side
// navigation keeps the module alive. A reload forgets it (the entry is then
// highlighted in its section, as when reached any other way).
let openedFromRecent: { kind: RecentEntityKind; id: string } | null = null

export function markOpenedFromRecent(kind: RecentEntityKind, id: string) {
  openedFromRecent = { kind, id }
}

export function clearOpenedFromRecent() {
  openedFromRecent = null
}

export function isOpenedFromRecent(entry: { kind: RecentEntityKind; id: string } | undefined): boolean {
  return !!entry && openedFromRecent?.kind === entry.kind && openedFromRecent.id === entry.id
}
