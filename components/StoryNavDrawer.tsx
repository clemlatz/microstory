'use client'

import { useLocale } from '@/lib/i18n/LocaleContext'

export type StorySection = 'overview' | 'characters' | 'notes' | 'documentation' | 'manuscript'

type NavItem = {
  section: StorySection
  label: string
  testId: string
}

/**
 * Left-hand, Notion-style navigation drawer for a story (issue #13):
 * overlays the main content (same visual pattern as `ConfigPanel` — fixed
 * backdrop + fixed left aside) and lists the story's sections as clickable
 * items, highlighting the currently active one. Replaces the ad hoc
 * navigation that used to live in `StoryHomeView` (`stories-back-button`,
 * `open-manuscript-button`) and `ChatWindow` (`story-overview-toggle`,
 * `stories-toggle`) — every one of those callers now opens this drawer
 * instead.
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
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <aside
        data-testid="story-nav-drawer"
        className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col border-r border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950"
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
        </div>
      </aside>
    </>
  )
}
