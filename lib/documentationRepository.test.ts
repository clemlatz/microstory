import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const storyId = 'story-1'

describe('documentationRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns an empty array when no entries exist', async () => {
    const { getAllDocumentationEntries } = await import('./documentationRepository')
    expect(getAllDocumentationEntries(storyId)).toEqual([])
  })

  it('createDocumentationEntry stores a new entry with generated id and timestamps', async () => {
    const { createDocumentationEntry, getAllDocumentationEntries } = await import(
      './documentationRepository'
    )

    const entry = createDocumentationEntry(
      { title: 'Gravité lunaire', content: 'Un sixième de la gravité terrestre' },
      storyId,
    )

    expect(entry.id).toBeTypeOf('string')
    expect(entry.title).toBe('Gravité lunaire')
    expect(entry.content).toBe('Un sixième de la gravité terrestre')
    expect(entry.url).toBeNull()
    expect(entry.createdAt).toBeTypeOf('number')
    expect(entry.updatedAt).toBe(entry.createdAt)
    expect(getAllDocumentationEntries(storyId)).toEqual([entry])
  })

  it('createDocumentationEntry stores the optional url', async () => {
    const { createDocumentationEntry } = await import('./documentationRepository')

    const entry = createDocumentationEntry(
      { title: 'Source', content: 'Contenu', url: 'https://example.com/source' },
      storyId,
    )

    expect(entry.url).toBe('https://example.com/source')
  })

  it('getAllDocumentationEntries orders results by createdAt ascending', async () => {
    const { createDocumentationEntry, getAllDocumentationEntries } = await import(
      './documentationRepository'
    )
    const first = createDocumentationEntry({ title: 'Première', content: 'Contenu 1' }, storyId)
    const second = createDocumentationEntry({ title: 'Deuxième', content: 'Contenu 2' }, storyId)

    expect(getAllDocumentationEntries(storyId)).toEqual([first, second])
  })

  it('getDocumentationEntryById returns the matching entry or null', async () => {
    const { createDocumentationEntry, getDocumentationEntryById } = await import(
      './documentationRepository'
    )
    const entry = createDocumentationEntry({ title: 'Recherche', content: 'Une recherche' }, storyId)

    expect(getDocumentationEntryById(entry.id, storyId)).toEqual(entry)
    expect(getDocumentationEntryById('missing-id', storyId)).toBeNull()
  })

  it('updateDocumentationEntry modifies title, content and url and bumps updatedAt', async () => {
    const { createDocumentationEntry, updateDocumentationEntry, getDocumentationEntryById } = await import(
      './documentationRepository'
    )
    const entry = createDocumentationEntry({ title: 'Recherche', content: 'Une recherche' }, storyId)

    const updated = updateDocumentationEntry(entry.id, storyId, {
      title: 'Recherche révisée',
      content: 'Une recherche plus précise',
      url: 'https://example.com',
    })

    expect(updated).not.toBeNull()
    expect(updated?.title).toBe('Recherche révisée')
    expect(updated?.content).toBe('Une recherche plus précise')
    expect(updated?.url).toBe('https://example.com')
    expect(updated?.createdAt).toBe(entry.createdAt)
    expect(getDocumentationEntryById(entry.id, storyId)).toEqual(updated)
  })

  it('updateDocumentationEntry clears the url when omitted', async () => {
    const { createDocumentationEntry, updateDocumentationEntry } = await import(
      './documentationRepository'
    )
    const entry = createDocumentationEntry(
      { title: 'Recherche', content: 'Une recherche', url: 'https://example.com' },
      storyId,
    )

    const updated = updateDocumentationEntry(entry.id, storyId, {
      title: 'Recherche',
      content: 'Une recherche',
    })

    expect(updated?.url).toBeNull()
  })

  it('updateDocumentationEntry returns null when the entry does not exist', async () => {
    const { updateDocumentationEntry } = await import('./documentationRepository')
    expect(updateDocumentationEntry('missing-id', storyId, { title: 'X', content: 'Y' })).toBeNull()
  })

  it('updateDocumentationEntry backs up the previous fields into documentation_versions', async () => {
    const { createDocumentationEntry, updateDocumentationEntry } = await import(
      './documentationRepository'
    )
    const { getDb } = await import('./db')
    const { VERSION_GROUPING_WINDOW_MS } = await import('./versionGroupingWindow')
    vi.useFakeTimers()
    try {
      vi.setSystemTime(0)
      const entry = createDocumentationEntry({ title: 'Recherche', content: 'Une recherche' }, storyId)

      vi.setSystemTime(VERSION_GROUPING_WINDOW_MS + 1)
      updateDocumentationEntry(entry.id, storyId, {
        title: 'Recherche révisée',
        content: 'Une recherche plus précise',
      })

      vi.setSystemTime(2 * (VERSION_GROUPING_WINDOW_MS + 1))
      updateDocumentationEntry(entry.id, storyId, {
        title: 'Recherche finale',
        content: 'Encore autre chose',
      })

      const versions = getDb()
        .prepare(
          'SELECT documentation_id, story_id, title, content FROM documentation_versions WHERE documentation_id = ? ORDER BY created_at ASC',
        )
        .all(entry.id)

      expect(versions).toEqual([
        { documentation_id: entry.id, story_id: storyId, title: 'Recherche', content: 'Une recherche' },
        {
          documentation_id: entry.id,
          story_id: storyId,
          title: 'Recherche révisée',
          content: 'Une recherche plus précise',
        },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('updateDocumentationEntry does not create a new version when edits happen within the grouping window', async () => {
    const { createDocumentationEntry, updateDocumentationEntry } = await import(
      './documentationRepository'
    )
    const { getDb } = await import('./db')
    vi.useFakeTimers()
    try {
      vi.setSystemTime(0)
      const entry = createDocumentationEntry({ title: 'Recherche', content: 'Une recherche' }, storyId)

      vi.setSystemTime(1000)
      updateDocumentationEntry(entry.id, storyId, { title: 'Recherche r', content: 'Une recherche p' })
      vi.setSystemTime(2000)
      updateDocumentationEntry(entry.id, storyId, { title: 'Recherche ré', content: 'Une recherche pl' })

      const versions = getDb()
        .prepare('SELECT title FROM documentation_versions WHERE documentation_id = ? ORDER BY created_at ASC')
        .all(entry.id)

      expect(versions).toEqual([{ title: 'Recherche' }])
    } finally {
      vi.useRealTimers()
    }
  })

  it('deleteDocumentationEntry removes the entry', async () => {
    const { createDocumentationEntry, deleteDocumentationEntry, getAllDocumentationEntries } =
      await import('./documentationRepository')
    const entry = createDocumentationEntry({ title: 'Recherche', content: 'Une recherche' }, storyId)
    deleteDocumentationEntry(entry.id, storyId)
    expect(getAllDocumentationEntries(storyId)).toEqual([])
  })

  it('deleteDocumentationEntry also removes its versions', async () => {
    const { createDocumentationEntry, updateDocumentationEntry, deleteDocumentationEntry } = await import(
      './documentationRepository'
    )
    const { getDb } = await import('./db')
    const entry = createDocumentationEntry({ title: 'Recherche', content: 'Une recherche' }, storyId)
    updateDocumentationEntry(entry.id, storyId, { title: 'Recherche révisée', content: 'Autre' })

    deleteDocumentationEntry(entry.id, storyId)

    const versions = getDb()
      .prepare('SELECT * FROM documentation_versions WHERE documentation_id = ?')
      .all(entry.id)
    expect(versions).toEqual([])
  })

  it('deleteDocumentationEntry on a missing id does not throw', async () => {
    const { deleteDocumentationEntry } = await import('./documentationRepository')
    expect(() => deleteDocumentationEntry('missing-id', storyId)).not.toThrow()
  })

  it("scopes entries by storyId, not returning another story's entries", async () => {
    const { createDocumentationEntry, getAllDocumentationEntries } = await import(
      './documentationRepository'
    )
    const entry = createDocumentationEntry({ title: 'Recherche', content: 'Une recherche' }, storyId)
    const otherEntry = createDocumentationEntry(
      { title: 'Autre recherche', content: 'Autre histoire' },
      'story-2',
    )

    expect(getAllDocumentationEntries(storyId)).toEqual([entry])
    expect(getAllDocumentationEntries('story-2')).toEqual([otherEntry])
  })

  describe('searchDocumentationEntries', () => {
    it('matches by title, case-insensitively', async () => {
      const { createDocumentationEntry, searchDocumentationEntries } = await import(
        './documentationRepository'
      )
      const entry = createDocumentationEntry({ title: 'Gravité lunaire', content: 'Contenu' }, storyId)
      createDocumentationEntry({ title: 'Autre sujet', content: 'Sans rapport' }, storyId)

      expect(searchDocumentationEntries('gravité', storyId)).toEqual([entry])
      expect(searchDocumentationEntries('GRAVITÉ', storyId)).toEqual([entry])
    })

    it('matches by content', async () => {
      const { createDocumentationEntry, searchDocumentationEntries } = await import(
        './documentationRepository'
      )
      const entry = createDocumentationEntry(
        { title: 'Gravité lunaire', content: 'Un sixième de la gravité terrestre' },
        storyId,
      )

      expect(searchDocumentationEntries('sixième', storyId)).toEqual([entry])
    })

    it('matches by url', async () => {
      const { createDocumentationEntry, searchDocumentationEntries } = await import(
        './documentationRepository'
      )
      const entry = createDocumentationEntry(
        { title: 'Source', content: 'Contenu', url: 'https://example.com/moon-gravity' },
        storyId,
      )

      expect(searchDocumentationEntries('moon-gravity', storyId)).toEqual([entry])
    })

    it('returns an empty array for an empty query', async () => {
      const { createDocumentationEntry, searchDocumentationEntries } = await import(
        './documentationRepository'
      )
      createDocumentationEntry({ title: 'Gravité lunaire', content: 'Contenu' }, storyId)

      expect(searchDocumentationEntries('', storyId)).toEqual([])
      expect(searchDocumentationEntries('   ', storyId)).toEqual([])
    })

    it('returns an empty array when nothing matches', async () => {
      const { createDocumentationEntry, searchDocumentationEntries } = await import(
        './documentationRepository'
      )
      createDocumentationEntry({ title: 'Gravité lunaire', content: 'Contenu' }, storyId)

      expect(searchDocumentationEntries('dragon', storyId)).toEqual([])
    })

    it("does not match another story's entries", async () => {
      const { createDocumentationEntry, searchDocumentationEntries } = await import(
        './documentationRepository'
      )
      createDocumentationEntry({ title: 'Gravité lunaire', content: 'Contenu' }, 'story-2')

      expect(searchDocumentationEntries('gravité', storyId)).toEqual([])
    })
  })
})
