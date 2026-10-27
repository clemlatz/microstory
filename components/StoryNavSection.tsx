'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { sortAlphabetically } from '@/lib/sortAlphabetically'
import type { RecentEntityKind } from '@/lib/recentEntities'
import { fetchCharacters, createCharacter } from '@/lib/charactersApi'
import { fetchNotes, createNote } from '@/lib/notesApi'
import { fetchDocumentation, createDocumentationEntry } from '@/lib/documentationApi'

type NavEntry = { id: string; title: string }

const ENTRY_PATHS: Record<RecentEntityKind, string> = {
  character: 'character',
  note: 'note',
  documentation: 'documentation',
}

const LOADERS: Record<RecentEntityKind, (storyId: string) => Promise<NavEntry[]>> = {
  character: async (storyId) => (await fetchCharacters(storyId)).map((c) => ({ id: c.id, title: c.name })),
  note: async (storyId) => (await fetchNotes(storyId)).map((n) => ({ id: n.id, title: n.title })),
  documentation: async (storyId) => (await fetchDocumentation(storyId)).map((d) => ({ id: d.id, title: d.title })),
}

// Entries are created with a placeholder title and no content, like the old
// inline form did (it only collected a title); the title is then edited in the
// title bar of the new entry's page.
const CREATORS: Record<RecentEntityKind, (storyId: string, title: string) => Promise<NavEntry>> = {
  character: async (storyId, title) => {
    const c = await createCharacter(storyId, { name: title, description: '' })
    return { id: c.id, title: c.name }
  },
  note: async (storyId, title) => {
    const n = await createNote(storyId, { title, content: '' })
    return { id: n.id, title: n.title }
  },
  documentation: async (storyId, title) => {
    const d = await createDocumentationEntry(storyId, { title, content: '' })
    return { id: d.id, title: d.title }
  },
}

const ROW =
  'flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left text-lg text-[var(--reader-ink)] md:text-sm'

/**
 * A foldable section of the navigation drawer (characters, notes or
 * documentation, Notion-style): selecting the section row unfolds the list of
 * its entries underneath instead of opening a page. Each entry links to its own
 * page, and a last row creates a new entry. The list is loaded whenever the
 * section is unfolded, and the entry currently open is highlighted.
 */
export function StoryNavSection({
  storyId,
  kind,
  label,
  icon,
  testId,
  newLabel,
  untitledLabel,
  expanded,
  onToggle,
  activeEntry,
  activeEntryTitle,
  onNavigateToEntry,
}: {
  storyId: string | undefined
  kind: RecentEntityKind
  label: string
  icon: ReactNode
  testId: string
  newLabel: string
  untitledLabel: string
  expanded: boolean
  onToggle: () => void
  activeEntry?: { kind: RecentEntityKind; id: string }
  /** Live title of the open entry, so a rename shows up before the list is reloaded. */
  activeEntryTitle?: string
  onNavigateToEntry?: () => void
}) {
  const { t } = useLocale()
  const router = useRouter()
  const [entries, setEntries] = useState<NavEntry[] | null>(null)
  const [hasError, setHasError] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const listId = `story-nav-list-${kind}`

  useEffect(() => {
    if (!expanded || !storyId) return
    let cancelled = false
    LOADERS[kind](storyId)
      .then((loaded) => {
        if (cancelled) return
        setEntries(sortAlphabetically(loaded, (entry) => entry.title))
        setHasError(false)
      })
      .catch((err) => {
        console.error(`Failed to load ${kind} entries`, err)
        if (!cancelled) setHasError(true)
      })
    return () => {
      cancelled = true
    }
  }, [expanded, storyId, kind])

  async function handleCreate() {
    if (!storyId || isCreating) return
    setIsCreating(true)
    setHasError(false)
    try {
      const created = await CREATORS[kind](storyId, untitledLabel)
      onNavigateToEntry?.()
      router.push(`/story/${storyId}/${ENTRY_PATHS[kind]}/${created.id}`)
    } catch (err) {
      console.error(`Failed to create ${kind}`, err)
      setHasError(true)
      setIsCreating(false)
    }
  }

  return (
    <div>
      <button
        data-testid={testId}
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={onToggle}
        className={`${ROW} hover:bg-[var(--reader-input-bg)]`}
      >
        {icon}
        {label}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-auto h-4 w-4 shrink-0 text-[var(--reader-muted)] transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
      {expanded && (
        <ul id={listId} data-testid={`${testId}-list`}>
          {entries === null && !hasError && (
            <li className="flex min-h-11 items-center pl-[38px] text-lg text-[var(--reader-muted)] md:text-sm">
              {t('common.loading')}
            </li>
          )}
          {(entries ?? []).map((entry) => {
            const isActive = activeEntry?.kind === kind && activeEntry.id === entry.id
            const title = (isActive && activeEntryTitle?.trim()) || entry.title
            return (
              <li key={entry.id}>
                <Link
                  data-testid="story-nav-entry"
                  href={`/story/${storyId}/${ENTRY_PATHS[kind]}/${entry.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={onNavigateToEntry}
                  className={`${ROW} pl-[38px] ${
                    isActive ? 'bg-[var(--reader-input-bg)] font-medium' : 'hover:bg-[var(--reader-input-bg)]'
                  }`}
                >
                  <span className="min-w-0 truncate">{title}</span>
                </Link>
              </li>
            )
          })}
          <li>
            <button
              data-testid="story-nav-new-entry"
              type="button"
              disabled={isCreating}
              onClick={handleCreate}
              className={`${ROW} pl-[38px] hover:bg-[var(--reader-input-bg)] disabled:opacity-50`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              {newLabel}
            </button>
          </li>
          {hasError && (
            <li role="alert" className="py-1 pl-[38px] text-sm text-[var(--reader-danger)]">
              {t('common.genericError')}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
