'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchKnowledgeBase } from '@/lib/searchApi'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { useRecentEntities, type RecentEntityKind } from '@/lib/recentEntities'
import { fetchCharacters } from '@/lib/charactersApi'
import { fetchNotes } from '@/lib/notesApi'
import { fetchDocumentation } from '@/lib/documentationApi'
import type { SearchResult } from '@/lib/types'

// Short enough to feel instantaneous while still skipping requests during fast typing.
const SEARCH_DEBOUNCE_MS = 60

const EDIT_PATH_BY_TYPE: Record<SearchResult['type'], string> = {
  character: 'character',
  note: 'note',
  documentation: 'documentation',
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** `text` with every case-insensitive occurrence of `query` in bold. */
function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'))
  return (
    <>
      {parts.map((part, index) =>
        // `split` with a capture group puts the matches at the odd indexes.
        index % 2 === 1 ? (
          <strong key={index} className="font-bold text-[var(--reader-ink)]">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  )
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
  // The query the displayed results answer (may lag behind the field while typing).
  const [resultsQuery, setResultsQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const recentEntities = useRecentEntities(storyId)
  // The recent list only remembers titles, so the text shown under each entry
  // is loaded here, once, for the kinds that appear in it.
  const [recentSnippets, setRecentSnippets] = useState<Record<string, string>>({})
  const recentKinds = [...new Set(recentEntities.map((e) => e.kind))].sort().join(',')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Opening the Search section (from the drawer or Cmd/Ctrl+K) puts the cursor
  // straight in the field.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!recentKinds) return
    const kinds = recentKinds.split(',') as RecentEntityKind[]
    const loaders: Record<RecentEntityKind, () => Promise<{ id: string; text: string }[]>> = {
      character: async () => (await fetchCharacters(storyId)).map((c) => ({ id: c.id, text: c.description })),
      note: async () => (await fetchNotes(storyId)).map((n) => ({ id: n.id, text: n.content })),
      documentation: async () => (await fetchDocumentation(storyId)).map((d) => ({ id: d.id, text: d.content })),
    }
    let isStale = false
    Promise.all(
      kinds.map((kind) =>
        loaders[kind]().then((entries) => entries.map((e) => [`${kind}:${e.id}`, e.text] as const)),
      ),
    )
      .then((groups) => {
        if (!isStale) setRecentSnippets(Object.fromEntries(groups.flat()))
      })
      .catch(() => {
        // Non-fatal: the recent entries just show without an excerpt.
      })
    return () => {
      isStale = true
    }
  }, [recentKinds, storyId])

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
          setResultsQuery(trimmed)
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
  // With nothing typed, the field offers the recently viewed entries instead.
  const recentItems: SearchResult[] = recentEntities.map((e) => ({
    type: e.kind,
    id: e.id,
    title: e.title,
    snippet: recentSnippets[`${e.kind}:${e.id}`] ?? '',
  }))
  const showRecent = isQueryEmpty && recentItems.length > 0
  const items = isQueryEmpty ? recentItems : results
  const isListShown = showRecent || (!isQueryEmpty && !error && hasSearched && results.length > 0)

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
      setActiveIndex((index) => Math.min(index + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      const result = items[activeIndex]
      if (!result) return
      event.preventDefault()
      router.push(`/story/${storyId}/${EDIT_PATH_BY_TYPE[result.type]}/${result.id}`)
    }
  }

  useEffect(() => {
    document.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex, results, showRecent])

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

      {(showRecent || (!isQueryEmpty && !error && hasSearched)) && (
        <div className="mt-2" data-testid="search-results">
          {showRecent && (
            <h2
              data-testid="search-recent-heading"
              className="px-2 pt-2 pb-1 text-xs font-semibold tracking-[0.09em] text-[var(--reader-muted)] uppercase"
            >
              {t('storyNav.recent')}
            </h2>
          )}
          {items.length === 0 ? (
            <p className="text-sm text-[var(--reader-muted)]">{t('search.noResults')}</p>
          ) : (
            <ul id="search-results-list" role="listbox" className="flex flex-col gap-1">
              {items.map((result, index) => (
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
                      <span className="text-base font-medium text-[var(--reader-ink)]">
                        <Highlighted text={result.title} query={isQueryEmpty ? '' : resultsQuery} />
                      </span>
                      <span
                        data-testid="search-result-type"
                        className="shrink-0 text-xs font-semibold tracking-[0.09em] text-[var(--reader-muted)] uppercase"
                      >
                        {t(`search.type.${result.type}`)}
                      </span>
                    </p>
                    {result.snippet && (
                      <p className="font-reader-body line-clamp-1 text-sm break-words text-[var(--reader-muted)]">
                        <Highlighted text={result.snippet} query={isQueryEmpty ? '' : resultsQuery} />
                      </p>
                    )}
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
