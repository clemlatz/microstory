'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { updateCharacter } from '@/lib/charactersApi'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Character } from '@/lib/types'

const CharacterDescriptionEditor = dynamic(
  () => import('./CharacterDescriptionEditor').then((mod) => mod.CharacterDescriptionEditor),
  { ssr: false },
)

/**
 * Notion-style dedicated page for editing one character (issue #7): large,
 * comfortable fields rather than the compact inline form on the story home
 * view. The description field is a BlockNote block editor (Notion-style
 * rich text, `CharacterDescriptionEditor`) rather than a plain textarea, so
 * markdown-like formatting (issue #7's "should support markdown
 * formatting") comes for free through BlockNote's own markdown
 * import/export rather than a bespoke renderer. `description` is still
 * persisted as a single markdown string, kept in sync here via the
 * editor's `onChangeMarkdown` callback — so the stored shape and the rest
 * of the app (character system-prompt injection, etc.) are unaffected.
 *
 * Saving or cancelling both return to the story home (`/story/[id]`), where
 * the character list itself still owns the excerpt/delete UI.
 */
export function CharacterEditPage({ storyId, character }: { storyId: string; character: Character }) {
  const { t } = useLocale()
  const router = useRouter()

  const [name, setName] = useState(character.name)
  const [description, setDescription] = useState(character.description)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function goBackToStory() {
    router.push(`/story/${storyId}`)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    if (!trimmedName || !trimmedDescription) {
      setError(t('characters.requiredError'))
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await updateCharacter(storyId, character.id, { name: trimmedName, description: trimmedDescription })
      goBackToStory()
    } catch (err) {
      console.error('Failed to save character', err)
      setError(err instanceof Error && err.message ? err.message : t('common.genericError'))
      setIsSaving(false)
    }
  }

  return (
    <div className="h-full flex-1 overflow-y-auto bg-[#fdfbf6] px-6 py-10 text-stone-900 sm:px-10 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto w-full max-w-2xl">
        <button
          data-testid="character-back-button"
          type="button"
          onClick={goBackToStory}
          className="mb-6 font-sans text-sm text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
        >
          {t('storyHome.back')}
        </button>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <h1 className="font-serif text-2xl text-stone-900 dark:text-stone-100">{t('characters.editTitle')}</h1>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-500 dark:text-gray-400">
              {t('characters.namePlaceholder')}
            </label>
            <input
              data-testid="character-page-name-input"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
              placeholder={t('characters.namePlaceholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-500 dark:text-gray-400">
              {t('characters.descriptionPlaceholder')}
            </label>
            <div
              data-testid="character-page-description-input"
              className="rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              <CharacterDescriptionEditor initialMarkdown={character.description} onChangeMarkdown={setDescription} />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              data-testid="character-page-save-button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500"
              disabled={isSaving}
            >
              {t('common.save')}
            </button>
            <button
              type="button"
              data-testid="character-page-cancel-button"
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700"
              onClick={goBackToStory}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
