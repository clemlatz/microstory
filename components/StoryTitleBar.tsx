'use client'

import { useLocale } from '@/lib/i18n/LocaleContext'
import { LogoutButton } from './LogoutButton'

/**
 * The story overview's top bar: a full-window-width strip pinned above
 * everything else — including `StoryNavDrawer`, which always renders below
 * it (a persistent sidebar on desktop, an overlay on narrower viewports).
 * Owned by `StoryPageClient` rather than `StoryHomeView` itself, since it
 * must span the whole window rather than just the content pane to the right
 * of the sidebar — a plain child of `StoryHomeView`'s own scrollable
 * container could never reach past that pane's left edge. Not shown over
 * the manuscript/`ChatWindow` view, which keeps its own separate header.
 *
 * `z-[60]` sits above the drawer's mobile overlay (`aside` at `z-50`, its
 * backdrop at `z-40`) so the toggle button — and the bar itself — stay
 * visible and reachable even while that overlay covers the rest of the
 * screen.
 *
 * Also hosts the sign-out control (`LogoutButton`, restyled to the Reader
 * palette via its `className` prop) on the right, mirroring the toggle
 * button's size so the title stays centered between them.
 *
 * `onTitleChange` (issue #18) makes the title itself editable in place —
 * an `<input>` rather than a plain `<h1>` — for a standalone entry page
 * (character, note, documentation, story presentation), which no longer
 * shows its own separate title/name field in the page body: this bar is
 * now the only place the title appears, and the only place it's edited.
 * Omitted by callers whose title isn't editable here (the story overview
 * itself, reached via `StoryPageClient`), which keeps the plain `<h1>`.
 *
 * `isSaving` (issue #20) renders a discreet save-status icon (a small dot)
 * right after the title — a pulsing muted dot while `isSaving` is true, a
 * plain checkmark once it settles to `false` — replacing the "Saving…"/
 * "Saved" text block each entry-edit page used to show in its own body.
 * Only rendered when `isSaving` is not `undefined` (i.e. only by callers
 * that autosave — every `onTitleChange` caller so far), and always carries
 * an `aria-label` reflecting the same two states so the status stays
 * accessible despite showing no text.
 */
export function StoryTitleBar({
  title,
  onOpenNav,
  onTitleChange,
  titlePlaceholder,
  isSaving,
}: {
  title: string
  onOpenNav: () => void
  onTitleChange?: (value: string) => void
  titlePlaceholder?: string
  isSaving?: boolean
}) {
  const { t } = useLocale()

  return (
    <div className="relative z-[60] flex h-14 w-full shrink-0 items-center gap-3 border-b border-[var(--reader-rule)] bg-[var(--reader-bg)]/90 px-4 font-reader-label backdrop-blur-sm sm:px-6">
      <button
        data-testid="story-nav-toggle"
        type="button"
        aria-label={t('chatWindow.navAria')}
        onClick={onOpenNav}
        className="shrink-0 rounded-lg p-3 text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
        </svg>
      </button>
      {onTitleChange ? (
        <input
          data-testid="story-title"
          className="min-h-11 min-w-0 flex-1 truncate border-none bg-transparent text-center font-reader-body text-base font-semibold tracking-tight text-[var(--reader-ink)] outline-none placeholder:text-[var(--reader-faint)]"
          placeholder={titlePlaceholder}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      ) : (
        <h1
          data-testid="story-title"
          className="min-w-0 flex-1 truncate text-center font-reader-body text-base font-semibold tracking-tight text-[var(--reader-ink)]"
        >
          {title}
        </h1>
      )}
      {isSaving !== undefined && (
        <span
          data-testid="story-save-status"
          role="status"
          aria-label={isSaving ? t('common.saving') : t('common.saved')}
          title={isSaving ? t('common.saving') : t('common.saved')}
          className="shrink-0"
        >
          {isSaving ? (
            <span
              className="block h-2 w-2 animate-pulse rounded-full bg-[var(--reader-muted)]"
              aria-hidden="true"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 text-[var(--reader-faint)]"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </span>
      )}
      <LogoutButton className="shrink-0 rounded-lg p-3 text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)] disabled:opacity-50" />
    </div>
  )
}
