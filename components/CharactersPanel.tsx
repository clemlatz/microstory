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
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">{t('characters.title')}</h3>
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        ) : characters.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('characters.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="character-list">
            {characters.map((character) => (
              <li
                key={character.id}
                data-testid="character-item"
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{character.name}</p>
                    <p className="line-clamp-3 text-sm break-words text-gray-500 dark:text-gray-400">
                      {character.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      data-testid="character-edit-button"
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => router.push(`/story/${storyId}/character/${character.id}`)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      data-testid="character-delete-button"
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
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
      </div>

      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            data-testid="character-name-input"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder={t('characters.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            type="submit"
            data-testid="character-save-button"
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
