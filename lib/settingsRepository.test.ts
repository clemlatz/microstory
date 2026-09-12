import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const STORY_ID = 'story-1'
const OTHER_STORY_ID = 'story-2'

describe('settingsRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns an empty string when the writer prompt was never set', async () => {
    const { getWriterPrompt } = await import('./settingsRepository')
    expect(getWriterPrompt(STORY_ID)).toBe('')
  })

  it('persists and retrieves the writer prompt', async () => {
    const { getWriterPrompt, setWriterPrompt } = await import('./settingsRepository')

    setWriterPrompt(STORY_ID, 'Tu es un auteur de roman policier.')

    expect(getWriterPrompt(STORY_ID)).toBe('Tu es un auteur de roman policier.')
  })

  it('overwrites a previously stored writer prompt', async () => {
    const { getWriterPrompt, setWriterPrompt } = await import('./settingsRepository')

    setWriterPrompt(STORY_ID, 'Premier prompt')
    setWriterPrompt(STORY_ID, 'Second prompt')

    expect(getWriterPrompt(STORY_ID)).toBe('Second prompt')
  })

  it('persists an empty string when clearing the writer prompt', async () => {
    const { getWriterPrompt, setWriterPrompt } = await import('./settingsRepository')

    setWriterPrompt(STORY_ID, 'Un prompt')
    setWriterPrompt(STORY_ID, '')

    expect(getWriterPrompt(STORY_ID)).toBe('')
  })

  it('stores the writer prompt in clear on disk, keyed by storyId', async () => {
    const { setWriterPrompt } = await import('./settingsRepository')
    const { getDb } = await import('./db')
    setWriterPrompt(STORY_ID, 'Tu es un auteur de roman policier.')

    const row = getDb()
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(`${STORY_ID}:writerPrompt`) as { value: string }
    expect(row.value).toBe('Tu es un auteur de roman policier.')
  })

  it('keeps writer prompts scoped separately per story', async () => {
    const { getWriterPrompt, setWriterPrompt } = await import('./settingsRepository')

    setWriterPrompt(STORY_ID, 'Prompt histoire 1')
    setWriterPrompt(OTHER_STORY_ID, 'Prompt histoire 2')

    expect(getWriterPrompt(STORY_ID)).toBe('Prompt histoire 1')
    expect(getWriterPrompt(OTHER_STORY_ID)).toBe('Prompt histoire 2')
  })

  it('returns the default max story words when never set', async () => {
    const { getMaxStoryWords, DEFAULT_MAX_STORY_WORDS } = await import('./settingsRepository')
    expect(getMaxStoryWords()).toBe(DEFAULT_MAX_STORY_WORDS)
  })

  it('persists and retrieves the max story words', async () => {
    const { getMaxStoryWords, setMaxStoryWords } = await import('./settingsRepository')

    setMaxStoryWords(250)

    expect(getMaxStoryWords()).toBe(250)
  })

  it('overwrites a previously stored max story words', async () => {
    const { getMaxStoryWords, setMaxStoryWords } = await import('./settingsRepository')

    setMaxStoryWords(250)
    setMaxStoryWords(50)

    expect(getMaxStoryWords()).toBe(50)
  })

  it('falls back to the default when the stored value is invalid', async () => {
    const { getMaxStoryWords, DEFAULT_MAX_STORY_WORDS } = await import('./settingsRepository')
    const { getDb } = await import('./db')

    getDb()
      .prepare(
        "INSERT INTO settings (key, value) VALUES ('maxStoryWords', @value) ON CONFLICT(key) DO UPDATE SET value = @value",
      )
      .run({ value: 'not-a-number' })

    expect(getMaxStoryWords()).toBe(DEFAULT_MAX_STORY_WORDS)
  })

  it('stores the max story words unencrypted on disk', async () => {
    const { setMaxStoryWords } = await import('./settingsRepository')
    const { getDb } = await import('./db')
    setMaxStoryWords(250)

    const row = getDb().prepare("SELECT value FROM settings WHERE key = 'maxStoryWords'").get() as {
      value: string
    }
    expect(row.value).toBe('250')
  })

  it('returns the default repetition penalty when never set', async () => {
    const { getRepetitionPenalty } = await import('./settingsRepository')
    const { DEFAULT_REPETITION_PENALTY } = await import('./repetitionPenaltyDefaults')
    expect(getRepetitionPenalty()).toBe(DEFAULT_REPETITION_PENALTY)
  })

  it('persists and retrieves the repetition penalty', async () => {
    const { getRepetitionPenalty, setRepetitionPenalty } = await import('./settingsRepository')

    setRepetitionPenalty(1.4)

    expect(getRepetitionPenalty()).toBe(1.4)
  })

  it('returns the default verbatim window words when never set', async () => {
    const { getVerbatimWindowWords, DEFAULT_VERBATIM_WINDOW_WORDS } = await import('./settingsRepository')
    expect(getVerbatimWindowWords()).toBe(DEFAULT_VERBATIM_WINDOW_WORDS)
  })

  it('persists and retrieves the verbatim window words', async () => {
    const { getVerbatimWindowWords, setVerbatimWindowWords } = await import('./settingsRepository')

    setVerbatimWindowWords(1800)

    expect(getVerbatimWindowWords()).toBe(1800)
  })

  it('falls back to the default verbatim window words when the stored value is invalid', async () => {
    const { getVerbatimWindowWords, setVerbatimWindowWords, DEFAULT_VERBATIM_WINDOW_WORDS } = await import(
      './settingsRepository'
    )

    setVerbatimWindowWords(0)

    expect(getVerbatimWindowWords()).toBe(DEFAULT_VERBATIM_WINDOW_WORDS)
  })

  it('returns the default auto-summary threshold words when never set', async () => {
    const { getAutoSummaryThresholdWords, DEFAULT_AUTO_SUMMARY_THRESHOLD_WORDS } = await import(
      './settingsRepository'
    )
    expect(getAutoSummaryThresholdWords()).toBe(DEFAULT_AUTO_SUMMARY_THRESHOLD_WORDS)
  })

  it('persists and retrieves the auto-summary threshold words', async () => {
    const { getAutoSummaryThresholdWords, setAutoSummaryThresholdWords } = await import(
      './settingsRepository'
    )

    setAutoSummaryThresholdWords(3000)

    expect(getAutoSummaryThresholdWords()).toBe(3000)
  })

  it('falls back to the default auto-summary threshold words when the stored value is invalid', async () => {
    const { getAutoSummaryThresholdWords, setAutoSummaryThresholdWords, DEFAULT_AUTO_SUMMARY_THRESHOLD_WORDS } =
      await import('./settingsRepository')

    setAutoSummaryThresholdWords(0)

    expect(getAutoSummaryThresholdWords()).toBe(DEFAULT_AUTO_SUMMARY_THRESHOLD_WORDS)
  })

  it('overwrites a previously stored repetition penalty', async () => {
    const { getRepetitionPenalty, setRepetitionPenalty } = await import('./settingsRepository')

    setRepetitionPenalty(1.4)
    setRepetitionPenalty(1.2)

    expect(getRepetitionPenalty()).toBe(1.2)
  })

  it('falls back to the default when the stored repetition penalty is invalid', async () => {
    const { getRepetitionPenalty } = await import('./settingsRepository')
    const { DEFAULT_REPETITION_PENALTY } = await import('./repetitionPenaltyDefaults')
    const { getDb } = await import('./db')

    getDb()
      .prepare(
        "INSERT INTO settings (key, value) VALUES ('repetitionPenalty', @value) ON CONFLICT(key) DO UPDATE SET value = @value",
      )
      .run({ value: 'not-a-number' })

    expect(getRepetitionPenalty()).toBe(DEFAULT_REPETITION_PENALTY)
  })

  it('falls back to the default when the stored repetition penalty is out of bounds', async () => {
    const { getRepetitionPenalty } = await import('./settingsRepository')
    const { DEFAULT_REPETITION_PENALTY } = await import('./repetitionPenaltyDefaults')
    const { getDb } = await import('./db')

    getDb()
      .prepare(
        "INSERT INTO settings (key, value) VALUES ('repetitionPenalty', @value) ON CONFLICT(key) DO UPDATE SET value = @value",
      )
      .run({ value: '2.5' })

    expect(getRepetitionPenalty()).toBe(DEFAULT_REPETITION_PENALTY)
  })

  it('stores the repetition penalty unencrypted on disk', async () => {
    const { setRepetitionPenalty } = await import('./settingsRepository')
    const { getDb } = await import('./db')
    setRepetitionPenalty(1.3)

    const row = getDb().prepare("SELECT value FROM settings WHERE key = 'repetitionPenalty'").get() as {
      value: string
    }
    expect(row.value).toBe('1.3')
  })

  it('returns an empty summary and null cutoff when never set', async () => {
    const { getConversationSummary } = await import('./settingsRepository')
    expect(getConversationSummary(STORY_ID)).toEqual({ summary: '', cutoffId: null })
  })

  it('persists and retrieves the conversation summary and cutoff id', async () => {
    const { getConversationSummary, setConversationSummary } = await import('./settingsRepository')

    setConversationSummary(STORY_ID, 'Alice explore la forêt.', 'msg-42')

    expect(getConversationSummary(STORY_ID)).toEqual({
      summary: 'Alice explore la forêt.',
      cutoffId: 'msg-42',
    })
  })

  it('overwrites a previously stored conversation summary', async () => {
    const { getConversationSummary, setConversationSummary } = await import('./settingsRepository')

    setConversationSummary(STORY_ID, 'Premier résumé.', 'msg-1')
    setConversationSummary(STORY_ID, 'Second résumé.', 'msg-2')

    expect(getConversationSummary(STORY_ID)).toEqual({ summary: 'Second résumé.', cutoffId: 'msg-2' })
  })

  it('clears the conversation summary and cutoff id', async () => {
    const { getConversationSummary, setConversationSummary, clearConversationSummary } =
      await import('./settingsRepository')

    setConversationSummary(STORY_ID, 'Un résumé.', 'msg-1')
    clearConversationSummary(STORY_ID)

    expect(getConversationSummary(STORY_ID)).toEqual({ summary: '', cutoffId: null })
  })

  it('stores the conversation summary and cutoff id in clear on disk, keyed by storyId', async () => {
    const { setConversationSummary } = await import('./settingsRepository')
    const { getDb } = await import('./db')
    setConversationSummary(STORY_ID, 'Alice explore la forêt.', 'msg-42')

    const summaryRow = getDb()
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(`${STORY_ID}:conversationSummary`) as { value: string }
    const cutoffRow = getDb()
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(`${STORY_ID}:conversationSummaryCutoffId`) as { value: string }

    expect(summaryRow.value).toBe('Alice explore la forêt.')
    expect(cutoffRow.value).toBe('msg-42')
  })

  it('keeps conversation summaries scoped separately per story', async () => {
    const { getConversationSummary, setConversationSummary } = await import('./settingsRepository')

    setConversationSummary(STORY_ID, 'Résumé histoire 1.', 'msg-1')
    setConversationSummary(OTHER_STORY_ID, 'Résumé histoire 2.', 'msg-2')

    expect(getConversationSummary(STORY_ID)).toEqual({ summary: 'Résumé histoire 1.', cutoffId: 'msg-1' })
    expect(getConversationSummary(OTHER_STORY_ID)).toEqual({
      summary: 'Résumé histoire 2.',
      cutoffId: 'msg-2',
    })
  })

  it('returns null for the current story id when never set', async () => {
    const { getCurrentStoryId } = await import('./settingsRepository')
    expect(getCurrentStoryId()).toBeNull()
  })

  it('persists and retrieves the current story id', async () => {
    const { getCurrentStoryId, setCurrentStoryId } = await import('./settingsRepository')

    setCurrentStoryId(STORY_ID)

    expect(getCurrentStoryId()).toBe(STORY_ID)
  })

  it('overwrites a previously stored current story id', async () => {
    const { getCurrentStoryId, setCurrentStoryId } = await import('./settingsRepository')

    setCurrentStoryId(STORY_ID)
    setCurrentStoryId(OTHER_STORY_ID)

    expect(getCurrentStoryId()).toBe(OTHER_STORY_ID)
  })
})
