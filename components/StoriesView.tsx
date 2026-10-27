'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchStories, createStory, renameStory, deleteStory } from '@/lib/storiesApi'
import { ConfirmDialog } from './ConfirmDialog'
import { LogoutButton } from './LogoutButton'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Story } from '@/lib/types'

export function StoriesView() {
  const router = useRouter()
  const { t, locale } = useLocale()
  const [stories, setStories] = useState<Story[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function actionErrorMessage(err: unknown): string {
    return err instanceof Error && err.message ? err.message : t('common.genericError')
  }

  useEffect(() => {
    fetchStories()
      .then(setStories)
      .catch((err) => setError(err instanceof Error ? err.message : t('stories.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate() {
    const title = newTitle.trim()
    if (!title) return
    setActionError(null)
    try {
      const story = await createStory(title)
      setIsCreating(false)
      setNewTitle('')
      router.push(`/story/${story.id}`)
    } catch (err) {
      console.error('Failed to create story', err)
      setActionError(actionErrorMessage(err))
    }
  }

  async function handleRename(id: string) {
    const title = editTitle.trim()
    if (!title) return
    setActionError(null)
    try {
      const updated = await renameStory(id, title)
      setStories((prev) => prev?.map((s) => (s.id === id ? updated : s)) ?? null)
      setEditingId(null)
    } catch (err) {
      console.error('Failed to rename story', err)
      setActionError(actionErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    setActionError(null)
    try {
      await deleteStory(deletingId)
      setStories((prev) => prev?.filter((s) => s.id !== deletingId) ?? null)
      setDeletingId(null)
    } catch (err) {
      console.error('Failed to delete story', err)
      setActionError(actionErrorMessage(err))
      setDeletingId(null)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--reader-bg)] px-6">
        <p data-testid="stories-error" className="font-reader-label text-sm text-[var(--reader-danger)]">
          {error}
        </p>
      </div>
    )
  }

  if (!stories) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--reader-bg)]">
        <p className="font-reader-label text-sm text-[var(--reader-faint)] italic">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[var(--reader-bg)] px-6 py-10 font-reader-label text-[var(--reader-ink)] sm:px-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-reader-body text-2xl font-semibold tracking-tight text-[var(--reader-ink)]">{t('stories.title')}</h1>
          <div className="flex items-center gap-2">
            <button
              data-testid="create-story-button"
              type="button"
              onClick={() => setIsCreating(true)}
              className="min-h-11 rounded-md border border-[var(--reader-rule)] px-3.5 py-1.5 text-sm text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]"
            >
              {t('stories.newButton')}
            </button>
            <LogoutButton />
          </div>
        </div>

        {actionError && (
          <p
            role="alert"
            data-testid="stories-action-error"
            className="mb-4 rounded-md bg-[var(--reader-input-bg)] px-3 py-2 text-sm text-[var(--reader-danger)]"
          >
            {actionError}
          </p>
        )}

        {isCreating ? (
          <div className="mb-6 flex gap-2.5 border-b border-[var(--reader-rule)] pb-4">
            <input
              data-testid="new-story-title-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              aria-label={t('stories.titlePlaceholder')}
              placeholder={t('stories.titlePlaceholder')}
              autoFocus
              className="min-h-11 min-w-0 flex-1 rounded-md border-none bg-[var(--reader-input-bg)] px-2.5 py-1.5 text-sm text-[var(--reader-ink)] placeholder:text-[var(--reader-faint)]"
            />
            <button
              data-testid="new-story-submit-button"
              type="button"
              onClick={handleCreate}
              className="min-h-11 shrink-0 rounded-md bg-[var(--reader-accent)] px-3.5 py-1.5 text-sm font-medium text-[var(--reader-accent-ink)] hover:opacity-90"
            >
              {t('stories.createButton')}
            </button>
          </div>
        ) : null}

        {stories.length === 0 ? (
          <p className="mt-16 text-center font-reader-body text-base text-[var(--reader-faint)] italic">
            {t('stories.empty')}
          </p>
        ) : (
          <ul data-testid="stories-list" className="flex flex-col">
            {stories.map((story) => (
              <li
                key={story.id}
                data-testid="story-item"
                className="border-b border-[var(--reader-rule)] py-2.5"
              >
                {editingId === story.id ? (
                  <div className="flex gap-2">
                    <input
                      data-testid="story-title-edit-input"
                      aria-label={t('stories.titlePlaceholder')}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                      className="min-h-11 min-w-0 flex-1 rounded-md border-none bg-[var(--reader-input-bg)] px-2.5 py-1.5 text-sm text-[var(--reader-ink)]"
                    />
                    <button
                      data-testid="story-title-save-button"
                      type="button"
                      onClick={() => handleRename(story.id)}
                      className="min-h-11 shrink-0 rounded-md bg-[var(--reader-accent)] px-3.5 py-1.5 text-sm font-medium text-[var(--reader-accent-ink)] hover:opacity-90"
                    >
                      {t('common.save')}
                    </button>
                    <button
                      data-testid="story-title-cancel-button"
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="min-h-11 shrink-0 rounded-md px-3.5 py-1.5 text-sm text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <a
                        href={`/story/${story.id}`}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
                            return
                          event.preventDefault()
                          router.push(`/story/${story.id}`)
                        }}
                        className="flex min-h-11 items-center font-reader-body text-base text-[var(--reader-ink)] hover:underline"
                      >
                        {story.title}
                      </a>
                      <time className="block pb-1 text-xs text-[var(--reader-faint)]">
                        {new Date(story.updatedAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                      </time>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-sm">
                      <button
                        data-testid="story-rename-button"
                        type="button"
                        onClick={() => {
                          setEditingId(story.id)
                          setEditTitle(story.title)
                        }}
                        className="min-h-11 rounded-md px-3 text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]"
                      >
                        {t('stories.rename')}
                      </button>
                      <button
                        data-testid="story-delete-button"
                        type="button"
                        onClick={() => setDeletingId(story.id)}
                        className="min-h-11 rounded-md px-3 text-[var(--reader-danger)] hover:bg-[var(--reader-input-bg)]"
                      >
                        {t('stories.delete')}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        title={t('stories.deleteTitle')}
        confirmLabel={t('stories.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
