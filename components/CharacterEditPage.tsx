'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { updateCharacter } from '@/lib/charactersApi'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Character } from '@/lib/types'

const CharacterDescriptionEditor = dynamic(
  () => import('./CharacterDescriptionEditor').then((mod) => mod.CharacterDescriptionEditor),
  { ssr: false },
)

const AUTOSAVE_DELAY_MS = 800

/**
 * Notion-style dedicated page for editing one character (issue #7): large,
 * comfortable fields rather than the compact inline form on the story home
 * view. The name field doubles as the page's title (no separate heading,
 * no field labels — Notion-style); the description field below it is a
 * BlockNote block editor (Notion-style rich text,
 * `CharacterDescriptionEditor`) filling the rest of the viewport, rather
 * than a plain textarea, so markdown-like formatting (issue #7's "should
 * support markdown formatting") comes for free through BlockNote's own
 * markdown import/export rather than a bespoke renderer.
 *
 * There is no save button: edits autosave, debounced by
 * `AUTOSAVE_DELAY_MS` after the last change to `name`/`description`, so a
 * character isn't written to the database on every keystroke. A pending
 * save is flushed immediately when navigating back, so the very last edit
 * isn't lost to an in-flight debounce timer. Nothing autosaves while the
 * name or description is empty (mirroring the old submit validation) —
 * saving simply waits for both to be filled in again.
 */
export function CharacterEditPage({ storyId, character }: { storyId: string; character: Character }) {
  const { t } = useLocale()
  const router = useRouter()

  const [name, setName] = useState(character.name)
  const [description, setDescription] = useState(character.description)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isFirstRender = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function persist(nextName: string, nextDescription: string) {
    const trimmedName = nextName.trim()
    const trimmedDescription = nextDescription.trim()
    if (!trimmedName || !trimmedDescription) return

    setIsSaving(true)
    try {
      await updateCharacter(storyId, character.id, { name: trimmedName, description: trimmedDescription })
      setError(null)
    } catch (err) {
      console.error('Failed to save character', err)
      setError(err instanceof Error && err.message ? err.message : t('common.genericError'))
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      persist(name, description)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description])

  function goBackToStory() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      persist(name, description)
    }
    router.push(`/story/${storyId}`)
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

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="mb-4 flex items-center justify-between gap-4">
            <input
              data-testid="character-page-name-input"
              className="min-w-0 flex-1 border-none bg-transparent font-serif text-3xl text-stone-900 outline-none placeholder:text-stone-300 dark:text-stone-100 dark:placeholder:text-stone-600"
              placeholder={t('characters.namePlaceholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <span
              data-testid="character-page-save-status"
              className="shrink-0 font-sans text-sm text-stone-400 dark:text-stone-500"
            >
              {isSaving ? t('common.saving') : t('common.saved')}
            </span>
          </div>

          {error && (
            <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div
            data-testid="character-page-description-input"
            className="character-description-editor min-h-0 flex-1 overflow-y-auto"
          >
            <CharacterDescriptionEditor initialMarkdown={character.description} onChangeMarkdown={setDescription} />
          </div>
        </div>
      </div>
    </div>
  )
}
