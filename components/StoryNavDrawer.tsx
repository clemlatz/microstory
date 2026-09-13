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
 * changes — it only closes when the user explicitly hides it (the
 * "Fermer" button here, or the same header toggle button that opened it).
 * Both modes are driven by the same `open` prop; only the CSS differs
 * per breakpoint, so there's a single implementation for both.
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
        className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col border-r border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950 md:static md:z-auto md:w-64 md:max-w-none md:shrink-0 md:shadow-none"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold">{t('storyNav.title')}</h2>
          <button
            data-testid="story-nav-close"
            type="button"
            className="text-sm text-gray-500 hover:underline dark:text-gray-400"
            onClick={onClose}
          >
            {t('common.close')}
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {items.map((item) => (
            <button
              key={item.section}
              data-testid={item.testId}
              type="button"
              aria-pressed={item.section === activeSection}
              onClick={() => onNavigate(item.section)}
              className={
                item.section === activeSection
                  ? 'block w-full rounded-md bg-gray-200 px-3 py-2 text-left text-sm font-medium dark:bg-gray-800'
                  : 'block w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900'
              }
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="shrink-0 border-t border-gray-200 p-2 dark:border-gray-800">
          <button
            data-testid="story-nav-my-stories"
            type="button"
            onClick={onBackToStories}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
          >
            {t('storyNav.myStories')}
          </button>
          <div className="mt-1 flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('language.label')}</span>
            <LanguageSwitcher className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" />
          </div>
        </div>
      </aside>
    </>
  )
}
