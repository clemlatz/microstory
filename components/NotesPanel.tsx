'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { fetchNotes, createNote, deleteNote } from '@/lib/notesApi'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Note } from '@/lib/types'

/**
 * Content of the "Notes" section of the story home view: list + create
 * form. Both editing and creating a note navigate away to its own
 * dedicated, Notion-style page (`/story/[id]/note/[noteId]`) — the create
 * form here only collects a title, creates the note with empty content,
 * and redirects there immediately so the content itself is filled in (and
 * autosaved) on that page, exactly like editing an existing one. Mirrors
 * `CharactersPanel`'s pattern.
 */
export function NotesPanel({ storyId }: { storyId: string }) {
  const { t } = useLocale()
  const router = useRouter()

  const errorMessage = useCallback(
    (error: unknown): string => (error instanceof Error && error.message ? error.message : t('common.genericError')),
    [t],
  )

  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchNotes(storyId)
      .then((loaded) => setNotes(loaded))
      .catch((err) => {
        console.error('Failed to load notes', err)
        setError(errorMessage(err))
      })
      .finally(() => setIsLoading(false))
  }, [storyId, errorMessage])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError(t('notes.requiredError'))
      return
    }

    setIsCreating(true)
    setError(null)
    try {
      const created = await createNote(storyId, { title: trimmedTitle, content: '' })
      router.push(`/story/${storyId}/note/${created.id}`)
    } catch (err) {
      console.error('Failed to save note', err)
      setError(errorMessage(err))
      setIsCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteNote(storyId, id)
      setNotes((prev) => prev.filter((note) => note.id !== id))
    } catch (err) {
      console.error('Failed to delete note', err)
      setError(errorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2 border-b border-[var(--reader-rule)] pb-2">
        <h3 className="text-xs font-semibold tracking-[0.09em] text-[var(--reader-muted)] uppercase">
          {t('notes.title')}
        </h3>
        {notes.length > 0 && <span className="text-[11px] text-[var(--reader-faint)]">{notes.length}</span>}
      </div>
      {isLoading ? (
        <p className="text-sm text-[var(--reader-muted)]">{t('common.loading')}</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-[var(--reader-muted)]">{t('notes.empty')}</p>
      ) : (
        <ul className="flex flex-col" data-testid="note-list">
          {notes.map((note) => (
            <li key={note.id} data-testid="note-item" className="border-b border-[var(--reader-rule)] py-2.5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[var(--reader-ink)]">{note.title}</p>
                  <p className="font-reader-body line-clamp-3 text-[13px] leading-relaxed break-words whitespace-pre-wrap text-[var(--reader-muted)]">
                    {note.content}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-xs">
                  <button
                    type="button"
                    data-testid="note-edit-button"
                    className="text-[var(--reader-accent)] hover:underline"
                    onClick={() => router.push(`/story/${storyId}/note/${note.id}`)}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    data-testid="note-delete-button"
                    className="text-[var(--reader-danger)] hover:underline"
                    onClick={() => handleDelete(note.id)}
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
            data-testid="note-title-input"
            className="min-w-0 flex-1 rounded-md border-none bg-[var(--reader-input-bg)] px-2.5 py-1.5 text-sm text-[var(--reader-ink)] placeholder:text-[var(--reader-faint)]"
            placeholder={t('notes.titlePlaceholder')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button
            type="submit"
            data-testid="note-save-button"
            className="shrink-0 rounded-md bg-[var(--reader-accent)] px-3.5 py-1.5 text-sm font-medium text-[var(--reader-accent-ink)] disabled:opacity-50"
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
