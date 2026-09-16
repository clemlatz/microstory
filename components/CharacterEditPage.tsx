'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { updateCharacter } from '@/lib/charactersApi'
import { StoryShell } from './StoryShell'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Character, Story } from '@/lib/types'

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
 *
 * Wrapped in `StoryShell` (same title bar + navigation drawer as the story
 * overview) rather than left standalone, so this dedicated page doesn't
 * feel like a dead end — the drawer's "Personnages" item is highlighted
 * (`activeSection="characters"`), and picking any other item flushes a
 * pending autosave before navigating away. The title bar shows the
 * character's own name (`entryTitle`, issue #16) and is itself the
 * editable name field (`onEntryTitleChange`, issue #18) — there is no
 * separate name heading in the page body any more, since showing the name
 * both there and in the bar read as a duplicated title. There's no
 * separate in-page "back to story" link either — navigation goes entirely
 * through the drawer.
 */
export function CharacterEditPage({
  story,
  character,
  llmWritingEnabled,
}: {
  story: Story
  character: Character
  llmWritingEnabled: boolean
}) {
  const { t } = useLocale()
  const router = useRouter()
  const storyId = story.id

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

  function flushPendingSave() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      persist(name, description)
    }
  }

  return (
    <StoryShell
      story={story}
      llmWritingEnabled={llmWritingEnabled}
      activeSection="characters"
      entryTitle={name}
      onEntryTitleChange={setName}
      entryTitlePlaceholder={t('characters.namePlaceholder')}
      isSaving={isSaving}
      onNavigate={(section) => {
        flushPendingSave()
        router.push(`/story/${storyId}?section=${section}`)
      }}
      onBackToStories={() => {
        flushPendingSave()
        router.push('/stories')
      }}
    >
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-[#fdfbf6] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[700px] flex-col px-6 py-6 sm:px-10">
            {error && (
              <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div data-testid="character-page-description-input" className="character-description-editor">
              <CharacterDescriptionEditor initialMarkdown={character.description} onChangeMarkdown={setDescription} />
            </div>
          </div>
        </div>
      </div>
    </StoryShell>
  )
}
