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
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">{t('notes.title')}</h3>
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('notes.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="note-list">
            {notes.map((note) => (
              <li
                key={note.id}
                data-testid="note-item"
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{note.title}</p>
                    <p className="line-clamp-3 text-sm break-words whitespace-pre-wrap text-gray-500 dark:text-gray-400">
                      {note.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      data-testid="note-edit-button"
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => router.push(`/story/${storyId}/note/${note.id}`)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      data-testid="note-delete-button"
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
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
      </div>

      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('notes.addTitle')}</h3>
        <input
          data-testid="note-title-input"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          placeholder={t('notes.titlePlaceholder')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            data-testid="note-save-button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500"
            disabled={isCreating}
          >
            {t('common.add')}
          </button>
        </div>
      </form>
    </div>
  )
}
