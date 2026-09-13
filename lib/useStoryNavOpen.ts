'use client'

import { useSyncExternalStore } from 'react'

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

// Whether the user has opened/closed the nav is remembered per-browser
// (`localStorage`), the same tradeoff `LocaleContext` makes for the locale
// preference: it survives a reload in this browser, but isn't synced across
// devices. `null` means "no choice remembered yet" — falls back to the
// viewport-based default (see `isNavOpen` below).
const NAV_OPEN_STORAGE_KEY = 'microstory_story_nav_open'

let navOpenListeners: Array<() => void> = []

function subscribeToStoredNavOpen(callback: () => void) {
  navOpenListeners = [...navOpenListeners, callback]
  return () => {
    navOpenListeners = navOpenListeners.filter((listener) => listener !== callback)
  }
}

function getStoredNavOpen(): boolean | null {
  try {
    const stored = window.localStorage.getItem(NAV_OPEN_STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    // Storage can throw (private browsing, blocked site data) — treat as
    // "no choice remembered", the viewport-based default is a fine fallback.
  }
  return null
}

function getStoredNavOpenServerSnapshot(): boolean | null {
  return null
}

function setStoredNavOpen(value: boolean) {
  try {
    window.localStorage.setItem(NAV_OPEN_STORAGE_KEY, String(value))
  } catch {
    // Non-fatal: the choice just won't survive a reload in this browser.
  }
  for (const listener of navOpenListeners) listener()
}

/**
 * Whether the story navigation drawer is open, and how to toggle/close it —
 * shared by every surface that renders `StoryNavDrawer` (`StoryPageClient`
 * and `StoryShell`), so the persisted/viewport-based open state (see
 * `isNavOpen` below) stays in sync between them rather than each keeping its
 * own copy.
 *
 * `isNavOpen` is `storedNavOpen ?? isDesktop`: the last open/closed choice
 * remembered for this browser (`storedNavOpen`, via `localStorage` above)
 * wins once one exists; before that, it falls back to following the
 * viewport (`isDesktop`) — open by default on a desktop-width viewport,
 * closed by default on a narrower one. Every open/close is persisted the
 * same way, so the next visit (any view, any device — well, any *browser*,
 * see above) restores exactly the state it was left in.
 */
export function useStoryNavOpen() {
  const isDesktop = useSyncExternalStore(subscribeToDesktopViewport, isDesktopViewport, getDesktopServerSnapshot)
  const storedNavOpen = useSyncExternalStore(
    subscribeToStoredNavOpen,
    getStoredNavOpen,
    getStoredNavOpenServerSnapshot,
  )
  const isNavOpen = storedNavOpen ?? isDesktop

  const toggleNav = () => setStoredNavOpen(!isNavOpen)
  const closeNav = () => setStoredNavOpen(false)

  return { isNavOpen, isDesktop, toggleNav, closeNav }
}
