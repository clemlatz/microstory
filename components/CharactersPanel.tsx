'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCharacters, createCharacter, deleteCharacter } from '@/lib/charactersApi'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Character } from '@/lib/types'

/**
 * Content of the "Personnages" section of the story home view: list +
 * create form. Editing a character (issue #7) navigates away to its own
 * dedicated, Notion-style page (`/story/[id]/character/[characterId]`)
 * instead of expanding an inline form here — this panel only ever creates
 * new characters and deletes existing ones.
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
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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
    const trimmedDescription = description.trim()
    if (!trimmedName || !trimmedDescription) {
      setError(t('characters.requiredError'))
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const created = await createCharacter(storyId, { name: trimmedName, description: trimmedDescription })
      setCharacters((prev) => [...prev, created])
      setName('')
      setDescription('')
    } catch (err) {
      console.error('Failed to save character', err)
      setError(errorMessage(err))
    } finally {
      setIsSaving(false)
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
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('characters.addTitle')}</h3>
        <input
          data-testid="character-name-input"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          placeholder={t('characters.namePlaceholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <textarea
          data-testid="character-description-input"
          className="resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          rows={3}
          placeholder={t('characters.descriptionPlaceholder')}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            data-testid="character-save-button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500"
            disabled={isSaving}
          >
            {t('common.add')}
          </button>
        </div>
      </form>
    </div>
  )
}
