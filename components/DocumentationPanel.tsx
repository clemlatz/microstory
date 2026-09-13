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
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-gray-500 dark:text-gray-400">{t('documentation.title')}</h3>
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">{t('documentation.description')}</p>
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('documentation.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="documentation-list">
            {entries.map((entry) => (
              <li
                key={entry.id}
                data-testid="documentation-item"
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{entry.title}</p>
                    <p className="line-clamp-3 text-sm break-words whitespace-pre-wrap text-gray-500 dark:text-gray-400">
                      {entry.content}
                    </p>
                    {entry.url && (
                      <a
                        data-testid="documentation-url-link"
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {entry.url}
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      data-testid="documentation-edit-button"
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => router.push(`/story/${storyId}/documentation/${entry.id}`)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      data-testid="documentation-delete-button"
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
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
      </div>

      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            data-testid="documentation-title-input"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder={t('documentation.titlePlaceholder')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button
            type="submit"
            data-testid="documentation-save-button"
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500"
            disabled={isCreating}
          >
            {t('common.add')}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
