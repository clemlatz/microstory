'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchKnowledgeBase } from '@/lib/searchApi'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { SearchResult } from '@/lib/types'

const SEARCH_DEBOUNCE_MS = 250

const EDIT_PATH_BY_TYPE: Record<SearchResult['type'], string> = {
  character: 'character',
  note: 'note',
  documentation: 'documentation',
}

const GROUP_ORDER: SearchResult['type'][] = ['character', 'note', 'documentation']

function groupByType(results: SearchResult[]): Partial<Record<SearchResult['type'], SearchResult[]>> {
  const groups: Partial<Record<SearchResult['type'], SearchResult[]>> = {}
  for (const result of results) {
    ;(groups[result.type] ??= []).push(result)
  }
  return groups
}

/**
 * A single search input above the story's Characters/Notes/Documentation
 * panels (issue #12): filters live, grouped by entity type, and clicking a
 * result navigates straight to its dedicated edit page — the same page
 * each panel's own "Modifier"/"Edit" action already leads to.
 */
export function SearchPanel({
  storyId,
  onActiveChange,
}: {
  storyId: string
  onActiveChange?: (isActive: boolean) => void
}) {
  const { t } = useLocale()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const errorMessage = useCallback(
    (err: unknown): string => (err instanceof Error && err.message ? err.message : t('search.error')),
    [t],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) return

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      setIsSearching(true)
      setError(null)
      searchKnowledgeBase(storyId, trimmed)
        .then((found) => {
          setResults(found)
          setHasSearched(true)
        })
        .catch((err) => {
          console.error('Search failed', err)
          setError(errorMessage(err))
          setResults([])
          setHasSearched(true)
        })
        .finally(() => setIsSearching(false))
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, storyId, errorMessage])

  const isQueryEmpty = query.trim() === ''

  useEffect(() => {
    onActiveChange?.(!isQueryEmpty)
  }, [isQueryEmpty, onActiveChange])

  const grouped = groupByType(results)

  return (
    <div className="mb-8">
      <input
        data-testid="search-input"
        type="search"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {!isQueryEmpty && error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {!isQueryEmpty && !error && hasSearched && !isSearching && (
        <div className="mt-2 flex flex-col gap-3" data-testid="search-results">
          {results.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('search.noResults')}</p>
          ) : (
            GROUP_ORDER.filter((type) => grouped[type]?.length).map((type) => (
              <div key={type}>
                <h4 className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {t(`search.${type === 'character' ? 'characters' : type === 'note' ? 'notes' : 'documentation'}`)}
                </h4>
                <ul className="flex flex-col gap-1">
                  {grouped[type]!.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        data-testid="search-result-item"
                        className="w-full rounded-lg border border-gray-200 p-2 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                        onClick={() =>
                          router.push(`/story/${storyId}/${EDIT_PATH_BY_TYPE[result.type]}/${result.id}`)
                        }
                      >
                        <p className="font-medium">{result.title}</p>
                        <p className="line-clamp-2 text-sm break-words text-gray-500 dark:text-gray-400">
                          {result.snippet}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
