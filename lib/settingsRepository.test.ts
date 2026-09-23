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
