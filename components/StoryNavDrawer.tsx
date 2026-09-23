'use client'

import type { ReactNode } from 'react'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { LanguageSwitcher } from './LanguageSwitcher'

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
  onClose,
  activeSection,
  onNavigate,
  onBackToStories,
}: {
  open: boolean
  onClose: () => void
  activeSection: StorySection
  onNavigate: (section: StorySection) => void
  onBackToStories: () => void
}) {
  const { t } = useLocale()

  if (!open) return null

  const items: NavItem[] = [
    { section: 'search', label: t('storyNav.search'), testId: 'story-nav-search', icon: SearchIcon },
    { section: 'overview', label: t('storyNav.overview'), testId: 'story-nav-overview', icon: OverviewIcon },
    { section: 'characters', label: t('storyNav.characters'), testId: 'story-nav-characters', icon: CharactersIcon },
    { section: 'notes', label: t('storyNav.notes'), testId: 'story-nav-notes', icon: NotesIcon },
    {
      section: 'documentation',
      label: t('storyNav.documentation'),
      testId: 'story-nav-documentation',
      icon: DocumentationIcon,
    },
  ]

  return (
    <>
      <div
        data-testid="story-nav-backdrop"
        className="fixed inset-0 z-40 bg-black/30 md:hidden"
        onClick={onClose}
      />
      <aside
        data-testid="story-nav-drawer"
        className="fixed top-14 bottom-0 left-0 z-50 flex w-full max-w-xs flex-col border-r border-[var(--reader-rule)] bg-[var(--reader-bg)] font-reader-label shadow-xl md:static md:top-auto md:bottom-auto md:z-auto md:w-64 md:max-w-none md:shrink-0 md:shadow-none"
      >
        <nav className="min-h-0 flex-1 overflow-y-auto p-2 pt-4">
          {items.map((item) => (
            <button
              key={item.section}
              data-testid={item.testId}
              type="button"
              aria-pressed={item.section === activeSection}
              onClick={() => onNavigate(item.section)}
              className={
                item.section === activeSection
                  ? 'flex min-h-11 w-full items-center gap-2.5 rounded-md bg-[var(--reader-input-bg)] px-3 text-left text-sm font-medium text-[var(--reader-ink)]'
                  : 'flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]'
              }
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="shrink-0 border-t border-[var(--reader-rule)] p-2">
          <button
            data-testid="story-nav-my-stories"
            type="button"
            onClick={onBackToStories}
            className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]"
          >
            {t('storyNav.myStories')}
          </button>
          <div className="mt-1 flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-sm text-[var(--reader-muted)]">{t('language.label')}</span>
            <LanguageSwitcher className="min-h-11 rounded-md border-none bg-[var(--reader-input-bg)] px-2 text-sm text-[var(--reader-muted)]" />
          </div>
        </div>
      </aside>
    </>
  )
}
