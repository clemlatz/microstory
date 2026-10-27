'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { useRecentEntities, type RecentEntityKind } from '@/lib/recentEntities'
import { LanguageSwitcher } from './LanguageSwitcher'
import { LogoutButton } from './LogoutButton'
import { StoryNavSection } from './StoryNavSection'
import { setNavSectionExpanded, useExpandedNavSections } from '@/lib/navExpandedSections'

export type StorySection = 'search' | 'overview' | 'characters' | 'notes' | 'documentation'

type NavItem = {
  section: StorySection
  label: string
  testId: string
  icon: ReactNode
}

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const SearchIcon = (
  <NavIcon>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20l-4.35-4.35" />
  </NavIcon>
)

const OverviewIcon = (
  <NavIcon>
    <rect width="7" height="7" x="3" y="3" rx="1.5" />
    <rect width="7" height="7" x="14" y="3" rx="1.5" />
    <rect width="7" height="7" x="3" y="14" rx="1.5" />
    <rect width="7" height="7" x="14" y="14" rx="1.5" />
  </NavIcon>
)

const CharactersIcon = (
  <NavIcon>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5" />
  </NavIcon>
)

const NotesIcon = (
  <NavIcon>
    <path d="M5 4h14v13l-4 3H5z" />
    <path d="M8.5 9h7M8.5 12.5h4.5" />
  </NavIcon>
)

const DocumentationIcon = (
  <NavIcon>
    <path d="M12 6.5c-1.4-1-3.3-1.5-5.5-1.5-1 0-1.9.1-2.5.3v13.2c.6-.2 1.5-.3 2.5-.3 2.2 0 4.1.5 5.5 1.5" />
    <path d="M12 6.5c1.4-1 3.3-1.5 5.5-1.5 1 0 1.9.1 2.5.3v13.2c-.6-.2-1.5-.3-2.5-.3-2.2 0-4.1.5-5.5 1.5V6.5Z" />
  </NavIcon>
)

// The three entry sections unfold in place (Notion-style) instead of opening a page.
const SECTION_KIND: Partial<Record<StorySection, RecentEntityKind>> = {
  characters: 'character',
  notes: 'note',
  documentation: 'documentation',
}

const NEW_ENTRY_LABELS = {
  character: 'storyNav.newCharacter',
  note: 'storyNav.newNote',
  documentation: 'storyNav.newDocumentation',
} as const

const UNTITLED_LABELS = {
  character: 'storyNav.untitledCharacter',
  note: 'storyNav.untitledNote',
  documentation: 'storyNav.untitledDocumentation',
} as const

const RECENT_ENTITY_ROUTES: Record<RecentEntityKind, { path: string; icon: ReactNode }> = {
  character: { path: 'character', icon: CharactersIcon },
  note: { path: 'note', icon: NotesIcon },
  documentation: { path: 'documentation', icon: DocumentationIcon },
}

/**
 * Left-hand, Notion-style navigation for a story (issue #13, turned into a
 * persistent desktop sidebar by a later revision): below the `md` (768px)
 * breakpoint it overlays the main content exactly as before (fixed backdrop
 * + fixed left aside, closed by default, `StoryPageClient` closes it again
 * after a section is picked); at `md` and above it instead sits in normal
 * document flow as a static sidebar (`md:static`, no backdrop) that
 * `StoryPageClient` shows by default and leaves open across section
 * changes — it only closes when the user explicitly hides it (the same
 * full-width header toggle button that opened it, or clicking the mobile
 * backdrop). Both modes are driven by the same `open` prop; only the CSS
 * differs per breakpoint, so there's a single implementation for both.
 *
 * Has no header of its own (no "Navigation" title, no "Fermer" button) —
 * that control now lives entirely in the full-width title bar above
 * `StoryHomeView`'s content, which stays visible above this drawer whether
 * it's open or closed and toggles it either way.
 *
 * Replaces the ad hoc navigation that used to live in `StoryHomeView`
 * (`stories-back-button`) — every one of those callers now opens this
 * instead.
 */
export function StoryNavDrawer({
  open,
  storyId,
  onClose,
  activeSection,
  activeEntry,
  activeEntryTitle,
  onNavigate,
  onNavigateToEntry,
  onBackToStories,
}: {
  open: boolean
  storyId?: string
  onClose: () => void
  activeSection: StorySection
  /**
   * The character/note/documentation entry currently displayed, if any. While
   * one is open it is the highlighted item (in "Recently viewed") and no
   * section is, whichever way the entry was reached.
   */
  activeEntry?: { kind: RecentEntityKind; id: string }
  /** Live title of `activeEntry`, so a rename shows in its list before a reload. */
  activeEntryTitle?: string
  onNavigate: (section: StorySection) => void
  /** Called when a "Recently viewed" entry is selected (e.g. so a mobile overlay can close itself). */
  onNavigateToEntry?: () => void
  onBackToStories: () => void
}) {
  const { t } = useLocale()
  const recentEntities = useRecentEntities(storyId)
  const asideRef = useRef<HTMLElement>(null)
  const expandedKinds = useExpandedNavSections(storyId)

  // Reveal the section of the page being shown (an open entry, or a section
  // reached through its `?section=` URL) so the current item is visible.
  const revealedKind = activeEntry?.kind ?? SECTION_KIND[activeSection]
  useEffect(() => {
    if (storyId && revealedKind) setNavSectionExpanded(storyId, revealedKind, true)
  }, [storyId, revealedKind])

  // The drawer stays mounted so it can slide in and out. Transitions are only
  // enabled after the first client frame: on desktop the open state is
  // reconciled right after hydration, and that correction must not animate.
  const [canAnimate, setCanAnimate] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setCanAnimate(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  // Callers pass an inline handler; a ref keeps the effect below from
  // re-running (and re-stealing focus) on every render.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Below the `md` breakpoint the drawer is a modal overlay, so it needs modal
  // keyboard behaviour: focus moves in on open, Escape closes, Tab stays
  // inside, and focus returns to the opener on close (WCAG 2.1.2, 2.4.3). At
  // `md` and above it is a persistent sidebar and none of this applies.
  useEffect(() => {
    if (!open || window.matchMedia('(min-width: 768px)').matches) return
    const opener = document.activeElement as HTMLElement | null
    const focusableSelector = 'a[href], button:not([disabled]), select:not([disabled])'
    asideRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !asideRef.current) return
      const focusable = asideRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      opener?.focus?.()
    }
  }, [open])

  const items: NavItem[] = [
    {
      section: 'search',
      label: t('storyNav.search'),
      testId: 'story-nav-search',
      icon: SearchIcon,
    },
    {
      section: 'overview',
      label: t('storyNav.overview'),
      testId: 'story-nav-overview',
      icon: OverviewIcon,
    },
    {
      section: 'characters',
      label: t('storyNav.characters'),
      testId: 'story-nav-characters',
      icon: CharactersIcon,
    },
    {
      section: 'notes',
      label: t('storyNav.notes'),
      testId: 'story-nav-notes',
      icon: NotesIcon,
    },
    {
      section: 'documentation',
      label: t('storyNav.documentation'),
      testId: 'story-nav-documentation',
      icon: DocumentationIcon,
    },
  ]

  return (
    <>
      {open && (
        <div data-testid="story-nav-backdrop" className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />
      )}
      <aside
        ref={asideRef}
        inert={!open}
        data-testid="story-nav-drawer"
        className={`surface-bar fixed top-14 bottom-0 left-0 z-50 flex w-full overflow-hidden border-r border-[var(--reader-rule)] bg-[var(--reader-bg)] font-reader-label shadow-xl md:static md:top-auto md:bottom-auto md:z-auto md:shrink-0 md:shadow-none ${
          canAnimate ? 'transition-[transform,visibility,width] duration-200 ease-out' : ''
        } ${open ? 'visible translate-x-0 md:w-64' : 'invisible -translate-x-full md:w-0 md:border-r-0'}`}
      >
        <div className="flex w-full min-w-0 flex-col md:w-64 md:shrink-0">
          <nav aria-label={t('storyNav.title')} className="min-h-0 flex-1 overflow-y-auto p-2 pt-4">
            {items.map((item) => {
              const kind = SECTION_KIND[item.section]
              if (kind) {
                return (
                  <StoryNavSection
                    key={item.section}
                    storyId={storyId}
                    kind={kind}
                    label={item.label}
                    icon={item.icon}
                    testId={item.testId}
                    newLabel={t(NEW_ENTRY_LABELS[kind])}
                    untitledLabel={t(UNTITLED_LABELS[kind])}
                    expanded={expandedKinds.includes(kind)}
                    onToggle={() => storyId && setNavSectionExpanded(storyId, kind, !expandedKinds.includes(kind))}
                    activeEntry={activeEntry}
                    activeEntryTitle={activeEntryTitle}
                    onNavigateToEntry={onNavigateToEntry}
                  />
                )
              }
              return (
                <a
                  key={item.section}
                  data-testid={item.testId}
                  href={`/story/${storyId}?section=${item.section}`}
                  aria-current={!activeEntry && item.section === activeSection ? 'page' : undefined}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                    event.preventDefault()
                    onNavigate(item.section)
                  }}
                  className={
                    !activeEntry && item.section === activeSection
                      ? 'flex min-h-11 w-full items-center gap-2.5 rounded-md bg-[var(--reader-input-bg)] px-3 text-left text-lg md:text-sm font-medium text-[var(--reader-ink)]'
                      : 'flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left text-lg md:text-sm text-[var(--reader-ink)] hover:bg-[var(--reader-input-bg)]'
                  }
                >
                  {item.icon}
                  {item.label}
                </a>
              )
            })}
            {storyId && recentEntities.length > 0 && (
              <div data-testid="story-nav-recent" className="mt-4">
                <h2 className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-[var(--reader-muted)]">
                  {t('storyNav.recent')}
                </h2>
                <ul>
                  {recentEntities.map((entity) => {
                    const isActive = activeEntry?.kind === entity.kind && activeEntry.id === entity.id
                    return (
                      <li key={`${entity.kind}-${entity.id}`}>
                        <Link
                          data-testid="story-nav-recent-item"
                          href={`/story/${storyId}/${RECENT_ENTITY_ROUTES[entity.kind].path}/${entity.id}`}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={onNavigateToEntry}
                          className={
                            isActive
                              ? 'flex min-h-11 w-full items-center gap-2.5 rounded-md bg-[var(--reader-input-bg)] px-3 text-left text-lg font-medium text-[var(--reader-ink)] md:text-sm'
                              : 'flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left text-lg text-[var(--reader-ink)] hover:bg-[var(--reader-input-bg)] md:text-sm'
                          }
                        >
                          {RECENT_ENTITY_ROUTES[entity.kind].icon}
                          <span className="min-w-0 truncate">{entity.title}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </nav>
          <div className="shrink-0 border-t border-[var(--reader-rule)] p-2">
            <button
              data-testid="story-nav-my-stories"
              type="button"
              onClick={onBackToStories}
              className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-lg md:text-sm text-[var(--reader-ink)] hover:bg-[var(--reader-input-bg)]"
            >
              {t('storyNav.myStories')}
            </button>
            {storyId && (
              <a
                data-testid="story-export-link"
                href={`/api/stories/${storyId}/export`}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left text-lg md:text-sm text-[var(--reader-ink)] hover:bg-[var(--reader-input-bg)]"
              >
                <NavIcon>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M12 15V3" />
                </NavIcon>
                {t('storyNav.export')}
              </a>
            )}
            <LogoutButton
              showLabel
              className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left text-lg md:text-sm text-[var(--reader-ink)] hover:bg-[var(--reader-input-bg)] disabled:opacity-50"
            />
            <div className="mt-1 flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-lg text-[var(--reader-ink)] md:text-sm">{t('language.label')}</span>
              <LanguageSwitcher className="min-h-11 rounded-md border-none bg-[var(--reader-input-bg)] px-2 text-base text-[var(--reader-ink)]" />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
