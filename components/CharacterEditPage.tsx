'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
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
 * view. The name field doubles as the page's title (no separate heading,
 * no field labels — Notion-style) with the save button on the same row;
 * the description field below it is a BlockNote block editor (Notion-style
 * rich text, `CharacterDescriptionEditor`) filling the rest of the
 * viewport, rather than a plain textarea, so markdown-like formatting
 * (issue #7's "should support markdown formatting") comes for free through
 * BlockNote's own markdown import/export rather than a bespoke renderer.
 * `description` is still persisted as a single markdown string, kept in
 * sync here via the editor's `onChangeMarkdown` callback — so the stored
 * shape and the rest of the app (character system-prompt injection, etc.)
 * are unaffected.
 *
 * Saving returns to the story home (`/story/[id]`), where the character
 * list itself still owns the excerpt/delete UI. There is no cancel button —
 * the back button above the title serves that purpose without saving.
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
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-[#fdfbf6] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-6 py-6 sm:px-10">
        <button
          data-testid="character-back-button"
          type="button"
          onClick={goBackToStory}
          className="mb-4 self-start font-sans text-sm text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
        >
          {t('storyHome.back')}
        </button>

        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <input
              data-testid="character-page-name-input"
              className="min-w-0 flex-1 border-none bg-transparent font-serif text-3xl text-stone-900 outline-none placeholder:text-stone-300 dark:text-stone-100 dark:placeholder:text-stone-600"
              placeholder={t('characters.namePlaceholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              type="submit"
              data-testid="character-page-save-button"
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500"
              disabled={isSaving}
            >
              {t('common.save')}
            </button>
          </div>

          {error && (
            <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div
            data-testid="character-page-description-input"
            className="min-h-0 flex-1 overflow-y-auto"
            style={{ '--bn-colors-editor-background': 'transparent' } as CSSProperties}
          >
            <CharacterDescriptionEditor initialMarkdown={character.description} onChangeMarkdown={setDescription} />
          </div>
        </form>
      </div>
    </div>
  )
}
