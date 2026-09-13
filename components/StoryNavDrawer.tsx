'use client'

import { useLocale } from '@/lib/i18n/LocaleContext'
import { LanguageSwitcher } from './LanguageSwitcher'

export type StorySection = 'overview' | 'characters' | 'notes' | 'documentation' | 'manuscript'

type NavItem = {
  section: StorySection
  label: string
  testId: string
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
 * (`stories-back-button`, `open-manuscript-button`) and `ChatWindow`
 * (`story-overview-toggle`, `stories-toggle`) — every one of those callers
 * now opens this instead.
 *
 * The "Manuscrit" item is omitted entirely when LLM-assisted writing is
 * disabled (`llmWritingEnabled`, issue #83) — mirroring how `StoryHomeView`
 * used to hide its own "Manuscrit" button in that case.
 */
export function StoryNavDrawer({
  open,
  onClose,
  activeSection,
  onNavigate,
  onBackToStories,
  llmWritingEnabled,
}: {
  open: boolean
  onClose: () => void
  activeSection: StorySection
  onNavigate: (section: StorySection) => void
  onBackToStories: () => void
  llmWritingEnabled: boolean
}) {
  const { t } = useLocale()

  if (!open) return null

  const items: NavItem[] = [
    { section: 'overview', label: t('storyNav.overview'), testId: 'story-nav-overview' },
    { section: 'characters', label: t('storyNav.characters'), testId: 'story-nav-characters' },
    { section: 'notes', label: t('storyNav.notes'), testId: 'story-nav-notes' },
    { section: 'documentation', label: t('storyNav.documentation'), testId: 'story-nav-documentation' },
    ...(llmWritingEnabled
      ? [{ section: 'manuscript' as const, label: t('storyNav.manuscript'), testId: 'story-nav-manuscript' }]
      : []),
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
        className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col border-r border-[var(--reader-rule)] bg-[var(--reader-bg)] font-reader-label shadow-xl md:static md:z-auto md:w-64 md:max-w-none md:shrink-0 md:shadow-none"
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
                  ? 'block w-full rounded-md bg-[var(--reader-input-bg)] px-3 py-2 text-left text-sm font-medium text-[var(--reader-ink)]'
                  : 'block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]'
              }
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="shrink-0 border-t border-[var(--reader-rule)] p-2">
          <button
            data-testid="story-nav-my-stories"
            type="button"
            onClick={onBackToStories}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]"
          >
            {t('storyNav.myStories')}
          </button>
          <div className="mt-1 flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-sm text-[var(--reader-muted)]">{t('language.label')}</span>
            <LanguageSwitcher className="rounded-md border-none bg-[var(--reader-input-bg)] px-2 py-1 text-sm text-[var(--reader-muted)]" />
          </div>
        </div>
      </aside>
    </>
  )
}
