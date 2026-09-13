'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCharacters, createCharacter, deleteCharacter } from '@/lib/charactersApi'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Character } from '@/lib/types'

/**
 * Content of the "Personnages" section of the story home view: list +
 * create form. Both editing (issue #7) and creating (this same issue's
 * follow-up) a character navigate away to its own dedicated, Notion-style
 * page (`/story/[id]/character/[characterId]`) — the create form here only
 * collects a name, creates the character with an empty description, and
 * redirects there immediately so the description itself is filled in
 * (and autosaved) on that page, exactly like editing an existing one.
 */
export function CharactersPanel({ storyId }: { storyId: string }) {
  const { t } = useLocale()
  const router = useRouter()

  const errorMessage = useCallback(
    (error: unknown): string => (error instanceof Error && error.message ? error.message : t('common.genericError')),
    [t],
  )

  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchCharacters(storyId)
      .then((loaded) => setCharacters(loaded))
      .catch((err) => {
        console.error('Failed to load characters', err)
        setError(errorMessage(err))
      })
      .finally(() => setIsLoading(false))
  }, [storyId, errorMessage])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(t('characters.requiredError'))
      return
    }

    setIsCreating(true)
    setError(null)
    try {
      const created = await createCharacter(storyId, { name: trimmedName, description: '' })
      router.push(`/story/${storyId}/character/${created.id}`)
    } catch (err) {
      console.error('Failed to save character', err)
      setError(errorMessage(err))
      setIsCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCharacter(storyId, id)
      setCharacters((prev) => prev.filter((character) => character.id !== id))
    } catch (err) {
      console.error('Failed to delete character', err)
      setError(errorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2 border-b border-[var(--reader-rule)] pb-2">
        <h3 className="text-xs font-semibold tracking-[0.09em] text-[var(--reader-muted)] uppercase">
          {t('characters.title')}
        </h3>
        {characters.length > 0 && <span className="text-[11px] text-[var(--reader-faint)]">{characters.length}</span>}
      </div>
      {isLoading ? (
        <p className="text-sm text-[var(--reader-muted)]">{t('common.loading')}</p>
      ) : characters.length === 0 ? (
        <p className="text-sm text-[var(--reader-muted)]">{t('characters.empty')}</p>
      ) : (
        <ul className="flex flex-col" data-testid="character-list">
          {characters.map((character) => (
            <li key={character.id} data-testid="character-item" className="border-b border-[var(--reader-rule)] py-2.5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[var(--reader-ink)]">{character.name}</p>
                  <p className="font-reader-body line-clamp-3 text-[13px] leading-relaxed break-words text-[var(--reader-muted)]">
                    {character.description}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-xs">
                  <button
                    type="button"
                    data-testid="character-edit-button"
                    className="text-[var(--reader-accent)] hover:underline"
                    onClick={() => router.push(`/story/${storyId}/character/${character.id}`)}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    data-testid="character-delete-button"
                    className="text-[var(--reader-danger)] hover:underline"
                    onClick={() => handleDelete(character.id)}
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
            data-testid="character-name-input"
            className="min-w-0 flex-1 rounded-md border-none bg-[var(--reader-input-bg)] px-2.5 py-1.5 text-sm text-[var(--reader-ink)] placeholder:text-[var(--reader-faint)]"
            placeholder={t('characters.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            type="submit"
            data-testid="character-save-button"
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
