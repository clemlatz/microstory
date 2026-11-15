'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchKnowledgeBase } from '@/lib/searchApi'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { SearchResult } from '@/lib/types'

// Short enough to feel instantaneous while still skipping requests during fast typing.
const SEARCH_DEBOUNCE_MS = 60

const EDIT_PATH_BY_TYPE: Record<SearchResult['type'], string> = {
  character: 'character',
  note: 'note',
  documentation: 'documentation',
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
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Opening the Search section (from the drawer or Cmd/Ctrl+K) puts the cursor
  // straight in the field.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const errorMessage = useCallback(
    (err: unknown): string => (err instanceof Error && err.message ? err.message : t('search.error')),
    [t],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) return

    // A slower response to an earlier query must never overwrite a newer one.
    let isStale = false

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      setError(null)
      searchKnowledgeBase(storyId, trimmed)
        .then((found) => {
          if (isStale) return
          setResults(found)
          setActiveIndex(0)
          setHasSearched(true)
        })
        .catch((err) => {
          if (isStale) return
          console.error('Search failed', err)
          setError(errorMessage(err))
          setResults([])
          setHasSearched(true)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      isStale = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, storyId, errorMessage])

  const isQueryEmpty = query.trim() === ''
  const isListShown = !isQueryEmpty && !error && hasSearched && results.length > 0

  // Clearing the field starts a brand-new search: drop the previous one's
  // results so they don't flash up again when typing resumes.
  function handleQueryChange(value: string) {
    setQuery(value)
    if (value.trim() === '') {
      setResults([])
      setHasSearched(false)
      setError(null)
      setActiveIndex(0)
    }
  }

  // Keyboard selection: the cursor stays in the field; Up/Down move the
  // highlight (the first result is highlighted by default) and Enter opens it.
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isListShown || event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      const result = results[activeIndex]
      if (!result) return
      event.preventDefault()
      router.push(`/story/${storyId}/${EDIT_PATH_BY_TYPE[result.type]}/${result.id}`)
    }
  }

  useEffect(() => {
    document.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex, results])

  useEffect(() => {
    onActiveChange?.(!isQueryEmpty)
  }, [isQueryEmpty, onActiveChange])

  return (
    <div className="mb-8">
      <input
        ref={inputRef}
        data-testid="search-input"
        type="search"
        className="min-h-11 w-full rounded-md border-none bg-[var(--reader-input-bg)] px-3 py-2 text-base text-[var(--reader-ink)] placeholder:text-[var(--reader-faint)]"
        aria-label={t('search.placeholder')}
            placeholder={t('search.placeholder')}
        role="combobox"
        aria-expanded={isListShown}
        aria-controls="search-results-list"
        aria-activedescendant={isListShown ? `search-result-${activeIndex}` : undefined}
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      {!isQueryEmpty && error && (
        <p role="alert" className="mt-2 text-sm text-[var(--reader-danger)]">
          {error}
        </p>
      )}

      {!isQueryEmpty && !error && hasSearched && (
        <div className="mt-2" data-testid="search-results">
          {results.length === 0 ? (
            <p className="text-sm text-[var(--reader-muted)]">{t('search.noResults')}</p>
          ) : (
            <ul id="search-results-list" role="listbox" className="flex flex-col gap-1">
              {results.map((result, index) => (
                <li
                  key={`${result.type}-${result.id}`}
                  id={`search-result-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  data-active={index === activeIndex}
                  onMouseMove={() => setActiveIndex(index)}
                >
                  <a
                    href={`/story/${storyId}/${EDIT_PATH_BY_TYPE[result.type]}/${result.id}`}
                    data-testid="search-result-item"
                    className={`block min-h-11 w-full rounded-md px-2 py-2.5 ${
                      index === activeIndex ? 'bg-[var(--reader-input-bg)]' : ''
                    }`}
                    tabIndex={-1}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
                        return
                      event.preventDefault()
                      router.push(`/story/${storyId}/${EDIT_PATH_BY_TYPE[result.type]}/${result.id}`)
                    }}
                  >
                    <p className="flex items-baseline gap-2">
                      <span className="text-base font-medium text-[var(--reader-ink)]">{result.title}</span>
                      <span
                        data-testid="search-result-type"
                        className="shrink-0 text-xs font-semibold tracking-[0.09em] text-[var(--reader-muted)] uppercase"
                      >
                        {t(`search.type.${result.type}`)}
                      </span>
                    </p>
                    <p className="font-reader-body line-clamp-2 text-sm break-words text-[var(--reader-muted)]">
                      {result.snippet}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
