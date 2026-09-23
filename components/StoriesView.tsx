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
      <div className="flex min-h-dvh items-center justify-center bg-[#fdfbf6] px-6 dark:bg-stone-950">
        <p data-testid="stories-error" className="font-sans text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      </div>
    )
  }

  if (!stories) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#fdfbf6] dark:bg-stone-950">
        <p className="font-sans text-sm text-stone-400 italic dark:text-stone-500">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#fdfbf6] px-6 py-10 text-stone-900 sm:px-10 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-2xl text-stone-900 dark:text-stone-100">{t('stories.title')}</h1>
          <div className="flex items-center gap-2">
            <button
              data-testid="create-story-button"
              type="button"
              onClick={() => setIsCreating(true)}
              className="rounded-lg border border-[#e7e1d5] bg-[#fffdf8] px-3 py-1.5 font-sans text-sm text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
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
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
          >
            {actionError}
          </p>
        )}

        {isCreating ? (
          <div className="mb-6 flex gap-2 rounded-lg border border-[#e7e1d5] bg-[#fffdf8] p-3 dark:border-stone-700 dark:bg-stone-900">
            <input
              data-testid="new-story-title-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('stories.titlePlaceholder')}
              autoFocus
              className="flex-1 rounded-md border border-[#e7e1d5] bg-white px-3 py-1.5 font-sans text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
            <button
              data-testid="new-story-submit-button"
              type="button"
              onClick={handleCreate}
              className="rounded-md bg-stone-900 px-3 py-1.5 font-sans text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              {t('stories.createButton')}
            </button>
          </div>
        ) : null}

        {stories.length === 0 ? (
          <p className="mt-16 text-center font-serif text-base text-stone-400 italic sm:text-lg dark:text-stone-600">
            {t('stories.empty')}
          </p>
        ) : (
          <ul data-testid="stories-list" className="flex flex-col gap-3">
            {stories.map((story) => (
              <li
                key={story.id}
                data-testid="story-item"
                className="rounded-lg border border-[#e7e1d5] bg-[#fffdf8] p-4 dark:border-stone-700 dark:bg-stone-900"
              >
                {editingId === story.id ? (
                  <div className="flex gap-2">
                    <input
                      data-testid="story-title-edit-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                      className="flex-1 rounded-md border border-[#e7e1d5] bg-white px-3 py-1.5 font-sans text-sm text-stone-900 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                    />
                    <button
                      data-testid="story-title-save-button"
                      type="button"
                      onClick={() => handleRename(story.id)}
                      className="rounded-md bg-stone-900 px-3 py-1.5 font-sans text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
                    >
                      {t('common.save')}
                    </button>
                    <button
                      data-testid="story-title-cancel-button"
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md px-3 py-1.5 font-sans text-sm text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/story/${story.id}`)}
                        className="text-left font-serif text-lg text-stone-900 hover:underline dark:text-stone-100"
                      >
                        {story.title}
                      </button>
                      <time className="block font-sans text-xs text-stone-400 dark:text-stone-500">
                        {new Date(story.updatedAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                      </time>
                    </div>
                    <div className="flex shrink-0 gap-1 font-sans text-sm">
                      <button
                        data-testid="story-rename-button"
                        type="button"
                        onClick={() => {
                          setEditingId(story.id)
                          setEditTitle(story.title)
                        }}
                        className="rounded-md px-2 py-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                      >
                        {t('stories.rename')}
                      </button>
                      <button
                        data-testid="story-delete-button"
                        type="button"
                        onClick={() => setDeletingId(story.id)}
                        className="rounded-md px-2 py-1 text-stone-400 hover:bg-red-50 hover:text-red-600 dark:text-stone-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
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
