import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.stubEnv('DATABASE_PATH', ':memory:')

describe('storiesRepository', () => {
  beforeEach(async () => {
    vi.resetModules()
    const { getDb } = await import('./db')
    getDb()
  })

  it('creates and reads back a story', async () => {
    const { createStory, getStoryById } = await import('./storiesRepository')
    const created = createStory('Le dernier hiver')
    expect(created.title).toBe('Le dernier hiver')
    expect(created.presentation).toBe('')
    expect(created.lastPassagePreview).toBeNull()

    const fetched = getStoryById(created.id)
    expect(fetched).toEqual(created)
  })

  it('lists stories ordered by most recently updated first', async () => {
    const { createStory, touchStory, getAllStories } = await import('./storiesRepository')
    const a = createStory('A')
    const b = createStory('B')
    touchStory(a.id)

    const all = getAllStories()
    expect(all.map((s) => s.id)).toEqual([a.id, b.id])
  })

  it('renames a story', async () => {
    const { createStory, renameStory } = await import('./storiesRepository')
    const story = createStory('Old title')
    const renamed = renameStory(story.id, 'New title')
    expect(renamed?.title).toBe('New title')
  })

  it('renameStory returns null for an unknown id', async () => {
    const { renameStory } = await import('./storiesRepository')
    expect(renameStory('missing', 'x')).toBeNull()
  })

  it('updates a story presentation', async () => {
    const { createStory, updateStoryPresentation } = await import('./storiesRepository')
    const story = createStory('Le dernier hiver')
    const updated = updateStoryPresentation(story.id, 'Un hiver sans fin sur une station polaire.')
    expect(updated?.presentation).toBe('Un hiver sans fin sur une station polaire.')
  })

  it('updateStoryPresentation allows clearing the presentation back to empty', async () => {
    const { createStory, updateStoryPresentation } = await import('./storiesRepository')
    const story = createStory('Le dernier hiver')
    updateStoryPresentation(story.id, 'Un pitch.')
    const cleared = updateStoryPresentation(story.id, '')
    expect(cleared?.presentation).toBe('')
  })

  it('updateStoryPresentation returns null for an unknown id', async () => {
    const { updateStoryPresentation } = await import('./storiesRepository')
    expect(updateStoryPresentation('missing', 'x')).toBeNull()
  })

  it('deleteStory removes the story and its messages/characters/summaries', async () => {
    const { createStory, deleteStory, getStoryById } = await import('./storiesRepository')
    const { appendMessage } = await import('./messagesRepository')
    const { createCharacter } = await import('./charactersRepository')

    const story = createStory('To delete')
    appendMessage({ id: 'm1', role: 'user', content: 'hi', timestamp: 1 }, story.id)
    createCharacter({ name: 'Alice', description: 'A hero' }, story.id)

    deleteStory(story.id)

    expect(getStoryById(story.id)).toBeNull()
    const { getAllMessages } = await import('./messagesRepository')
    expect(getAllMessages(story.id)).toEqual([])
    const { getAllCharacters } = await import('./charactersRepository')
    expect(getAllCharacters(story.id)).toEqual([])
  })

  describe('ensureDefaultStory', () => {
    it('migrates pre-multi-story data into a new default story', async () => {
      const { getDb } = await import('./db')
      const db = getDb()

      // Seed rows simulating the old single-story schema: messages/characters
      // with story_id IS NULL, and bare (unscoped) settings keys.
      db.prepare(
        'INSERT INTO messages (id, role, content, timestamp, story_id) VALUES (@id, @role, @content, @timestamp, NULL)',
      ).run({ id: 'm1', role: 'user', content: 'Bonjour', timestamp: 1000 })
      db.prepare(
        'INSERT INTO characters (id, name, description, created_at, updated_at, story_id) VALUES (@id, @name, @description, @createdAt, @updatedAt, NULL)',
      ).run({
        id: 'c1',
        name: 'Alice',
        description: 'A hero',
        createdAt: 1000,
        updatedAt: 1000,
      })
      db.prepare(
        'INSERT INTO conversation_summaries (id, content, cutoff_message_id, created_at, type, story_id) VALUES (@id, @content, @cutoffMessageId, @createdAt, @type, NULL)',
      ).run({
        id: 's1',
        content: 'Ancien résumé',
        cutoffMessageId: 'm0',
        createdAt: 500,
        type: 'manual',
      })
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
        'writerPrompt',
        'Tu es un auteur de roman policier.',
      )
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
        'conversationSummary',
        'Résumé courant',
      )
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
        'conversationSummaryCutoffId',
        'm1',
      )

      const { ensureDefaultStory, getAllStories } = await import('./storiesRepository')
      ensureDefaultStory()

      const stories = getAllStories()
      expect(stories).toHaveLength(1)
      const storyId = stories[0].id
      expect(stories[0].title).toBe('Histoire 1')

      const { getAllMessages } = await import('./messagesRepository')
      expect(getAllMessages(storyId)).toEqual([
        { id: 'm1', role: 'user', content: 'Bonjour', timestamp: 1000 },
      ])

      const { getAllCharacters } = await import('./charactersRepository')
      const characters = getAllCharacters(storyId)
      expect(characters).toHaveLength(1)
      expect(characters[0]).toMatchObject({ name: 'Alice', description: 'A hero' })

      const { getAllConversationSummaries } = await import('./conversationSummariesRepository')
      const summaries = getAllConversationSummaries(storyId)
      expect(summaries).toHaveLength(1)
      expect(summaries[0].content).toBe('Ancien résumé')

      const { getWriterPrompt, getConversationSummary, getCurrentStoryId } = await import(
        './settingsRepository'
      )
      expect(getWriterPrompt(storyId)).toBe('Tu es un auteur de roman policier.')
      expect(getConversationSummary(storyId)).toEqual({
        summary: 'Résumé courant',
        cutoffId: 'm1',
      })
      expect(getCurrentStoryId()).toBe(storyId)

      // a second call is a no-op: no second story created, nothing touched
      ensureDefaultStory()
      expect(getAllStories()).toHaveLength(1)
      expect(getAllStories()[0].id).toBe(storyId)
    })

    it('does nothing when there is no legacy data and no story exists yet', async () => {
      const { ensureDefaultStory, getAllStories } = await import('./storiesRepository')
      ensureDefaultStory()
      expect(getAllStories()).toEqual([])
    })
  })
})
