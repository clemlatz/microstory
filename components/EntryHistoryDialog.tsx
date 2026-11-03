'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { fetchEntryVersions } from '@/lib/entryVersionsApi'
import type { RecentEntityKind } from '@/lib/recentEntities'
import type { EntryVersion } from '@/lib/types'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; versions: EntryVersion[] }

/**
 * Read-only history of one character/note/documentation entry: a list of its
 * backed-up past versions, and a click on one shows that version's title and
 * content as plain selectable text so a lost passage can be copied back into
 * the live entry. There is deliberately no "restore" action.
 *
 * Each version holds the entry as it was *before* an editing session
 * overwrote it (see `lib/versionGroupingWindow.ts`), so it is labelled
 * "Before <date>" rather than with a bare date. Rendered only while open
 * (the caller mounts/unmounts it), so every opening starts from a fresh load.
 */
export function EntryHistoryDialog({
  kind,
  storyId,
  entryId,
  onClose,
}: {
  kind: RecentEntityKind
  storyId: string
  entryId: string
  onClose: () => void
}) {
  const { t, locale } = useLocale()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const selectedIdRef = useRef(selectedId)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    selectedIdRef.current = selectedId
    onCloseRef.current = onClose
  })

  useEffect(() => {
    let cancelled = false
    fetchEntryVersions(kind, storyId, entryId)
      .then((versions) => {
        if (!cancelled) setLoad({ status: 'ready', versions })
      })
      .catch((err) => {
        console.error('Failed to load entry versions', err)
        if (!cancelled) setLoad({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [kind, storyId, entryId])

  // Modal keyboard behaviour: focus the close button on open, Escape steps back
  // from a version to the list and then closes, and focus returns to the opener.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (selectedIdRef.current !== null) setSelectedId(null)
      else onCloseRef.current()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      opener?.focus?.()
    }
  }, [])

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
  }

  const versions = load.status === 'ready' ? load.versions : []
  const selected = versions.find((version) => version.id === selectedId) ?? null

  return (
    <div
      data-testid="entry-history-backdrop"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('history.title')}
        data-testid="entry-history"
        className="flex max-h-full w-full max-w-2xl flex-col rounded-lg border border-[var(--reader-rule)] bg-[var(--reader-bg)] font-reader-label text-[var(--reader-ink)] shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--reader-rule)] px-4 py-2">
          {selected && (
            <button
              data-testid="entry-history-back"
              type="button"
              className="min-h-11 rounded-md px-3 text-sm text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]"
              onClick={() => setSelectedId(null)}
            >
              ← {t('history.back')}
            </button>
          )}
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {selected ? t('history.versionLabel', { date: formatDate(selected.createdAt) }) : t('history.title')}
          </h2>
          <button
            ref={closeRef}
            data-testid="entry-history-close"
            type="button"
            className="min-h-11 rounded-md px-3 text-sm text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]"
            onClick={onClose}
          >
            {t('common.close')}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {load.status === 'loading' && (
            <p className="text-sm text-[var(--reader-muted)]">{t('common.loading')}</p>
          )}
          {load.status === 'error' && (
            <p role="alert" className="text-sm text-[var(--reader-danger)]">
              {t('common.genericError')}
            </p>
          )}
          {load.status === 'ready' && versions.length === 0 && (
            <p data-testid="entry-history-empty" className="text-sm text-[var(--reader-muted)]">
              {t('history.empty')}
            </p>
          )}
          {load.status === 'ready' && versions.length > 0 && !selected && (
            <>
              <p className="mb-3 text-sm text-[var(--reader-muted)]">{t('history.hint')}</p>
              <ul data-testid="entry-history-list" className="flex flex-col gap-1">
                {versions.map((version) => (
                  <li key={version.id}>
                    <button
                      data-testid="entry-history-item"
                      type="button"
                      className="flex min-h-11 w-full flex-col items-start justify-center rounded-md px-3 py-1.5 text-left hover:bg-[var(--reader-input-bg)]"
                      onClick={() => setSelectedId(version.id)}
                    >
                      <span className="text-sm font-medium">
                        {t('history.versionLabel', { date: formatDate(version.createdAt) })}
                      </span>
                      <span className="w-full truncate text-xs text-[var(--reader-muted)]">{version.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {selected && (
            <article data-testid="entry-history-version" className="font-reader-body">
              <h3 className="mb-3 text-base font-semibold">{selected.title}</h3>
              <div className="whitespace-pre-wrap break-words text-sm select-text">{selected.content}</div>
            </article>
          )}
        </div>
      </div>
    </div>
  )
}
