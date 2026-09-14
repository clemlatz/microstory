'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { fetchDocumentation, createDocumentationEntry, deleteDocumentationEntry } from '@/lib/documentationApi'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { DocumentationEntry } from '@/lib/types'

/**
 * Content of the "Documentation" section of the story home view (issue
 * #11): a list + create form, mirroring `NotesPanel`'s pattern exactly.
 * Unlike Notes (free-form personal ideas), Documentation is meant as
 * factual reference material an external LLM (via MCP) can also archive
 * research into — the section description spells out that distinction so
 * a human doesn't confuse where to put content either.
 *
 * Both editing and creating an entry navigate away to its own dedicated,
 * Notion-style page (`/story/[id]/documentation/[documentationId]`) — the
 * create form here only collects a title, creates the entry with empty
 * content and no url, and redirects there immediately so the rest is
 * filled in (and autosaved) on that page, exactly like Notes.
 */
export function DocumentationPanel({ storyId }: { storyId: string }) {
  const { t } = useLocale()
  const router = useRouter()

  const errorMessage = useCallback(
    (error: unknown): string => (error instanceof Error && error.message ? error.message : t('common.genericError')),
    [t],
  )

  const [entries, setEntries] = useState<DocumentationEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchDocumentation(storyId)
      .then((loaded) => setEntries(loaded))
      .catch((err) => {
        console.error('Failed to load documentation', err)
        setError(errorMessage(err))
      })
      .finally(() => setIsLoading(false))
  }, [storyId, errorMessage])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError(t('documentation.requiredError'))
      return
    }

    setIsCreating(true)
    setError(null)
    try {
      const created = await createDocumentationEntry(storyId, { title: trimmedTitle, content: '' })
      router.push(`/story/${storyId}/documentation/${created.id}`)
    } catch (err) {
      console.error('Failed to save documentation entry', err)
      setError(errorMessage(err))
      setIsCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocumentationEntry(storyId, id)
      setEntries((prev) => prev.filter((entry) => entry.id !== id))
    } catch (err) {
      console.error('Failed to delete documentation entry', err)
      setError(errorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5 border-b border-[var(--reader-rule)] pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-[0.09em] text-[var(--reader-muted)] uppercase">
            {t('documentation.title')}
          </h3>
          {entries.length > 0 && <span className="text-[11px] text-[var(--reader-faint)]">{entries.length}</span>}
        </div>
        <p className="font-reader-body text-xs text-[var(--reader-faint)]">{t('documentation.description')}</p>
      </div>
      {isLoading ? (
        <p className="text-sm text-[var(--reader-muted)]">{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--reader-muted)]">{t('documentation.empty')}</p>
      ) : (
        <ul className="flex flex-col" data-testid="documentation-list">
          {entries.map((entry) => (
            <li key={entry.id} data-testid="documentation-item" className="border-b border-[var(--reader-rule)] py-2.5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[var(--reader-ink)]">{entry.title}</p>
                  <p className="font-reader-body line-clamp-3 text-[13px] leading-relaxed break-words whitespace-pre-wrap text-[var(--reader-muted)]">
                    {entry.content}
                  </p>
                  {entry.url && (
                    <a
                      data-testid="documentation-url-link"
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs break-all text-[var(--reader-accent)] hover:underline"
                    >
                      {entry.url}
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs">
                  <button
                    type="button"
                    data-testid="documentation-edit-button"
                    className="inline-flex min-h-11 items-center rounded-md px-3 text-[var(--reader-accent)] hover:underline"
                    onClick={() => router.push(`/story/${storyId}/documentation/${entry.id}`)}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    data-testid="documentation-delete-button"
                    className="inline-flex min-h-11 items-center rounded-md px-3 text-[var(--reader-danger)] hover:underline"
                    onClick={() => handleDelete(entry.id)}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="flex flex-col gap-2 pt-1" onSubmit={handleSubmit}>
        <div className="flex items-center gap-2.5">
          <input
            data-testid="documentation-title-input"
            className="min-w-0 flex-1 min-h-11 rounded-md border-none bg-[var(--reader-input-bg)] px-2.5 py-1.5 text-sm text-[var(--reader-ink)] placeholder:text-[var(--reader-faint)]"
            placeholder={t('documentation.titlePlaceholder')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button
            type="submit"
            data-testid="documentation-save-button"
            className="shrink-0 min-h-11 rounded-md bg-[var(--reader-accent)] px-3.5 py-1.5 text-sm font-medium text-[var(--reader-accent-ink)] disabled:opacity-50"
            disabled={isCreating}
          >
            {t('common.add')}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-[var(--reader-danger)]">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
