import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/settingsRepository', () => ({
  getWriterPrompt: vi.fn(),
  getMaxStoryWords: vi.fn(),
}))

vi.mock('@/lib/charactersRepository', () => ({
  getAllCharacters: vi.fn(),
  buildCharactersSystemMessage: vi.fn(),
}))

import { buildSystemMessages } from './buildSystemPrompt'
import { getWriterPrompt, getMaxStoryWords } from '@/lib/settingsRepository'
import { getAllCharacters, buildCharactersSystemMessage } from '@/lib/charactersRepository'
import { CHANNEL_SYSTEM_PROMPT } from '@/lib/channelSystemPrompt'
import { buildStoryWordLimitMessage } from '@/lib/storyWordLimitPrompt'

const mockedGetWriterPrompt = vi.mocked(getWriterPrompt)
const mockedGetMaxStoryWords = vi.mocked(getMaxStoryWords)
const mockedGetAllCharacters = vi.mocked(getAllCharacters)
const mockedBuildCharactersSystemMessage = vi.mocked(buildCharactersSystemMessage)
const STORY_ID = 'story-1'

describe('buildSystemMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetWriterPrompt.mockReturnValue('')
    mockedGetMaxStoryWords.mockReturnValue(100)
    mockedGetAllCharacters.mockReturnValue([])
    mockedBuildCharactersSystemMessage.mockReturnValue(null)
  })

  it('always includes the channel and word limit instructions, in that order', () => {
    expect(buildSystemMessages(STORY_ID)).toEqual([
      { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
      { role: 'system', content: buildStoryWordLimitMessage(100) },
    ])
  })

  it('derives the word limit instruction from the configured max story words', () => {
    mockedGetMaxStoryWords.mockReturnValue(250)

    expect(buildSystemMessages(STORY_ID)).toEqual([
      { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
      { role: 'system', content: buildStoryWordLimitMessage(250) },
    ])
  })

  it('appends the writer prompt when one is set', () => {
    mockedGetWriterPrompt.mockReturnValue('Tu es un auteur de roman policier.')

    expect(buildSystemMessages(STORY_ID)).toEqual([
      { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
      { role: 'system', content: buildStoryWordLimitMessage(100) },
      { role: 'system', content: 'Tu es un auteur de roman policier.' },
    ])
    expect(mockedGetWriterPrompt).toHaveBeenCalledWith(STORY_ID)
  })

  it('appends the characters system message when there are characters', () => {
    const characters = [
      { id: 'a', name: 'Alice', description: 'Une exploratrice', createdAt: 1, updatedAt: 1 },
    ]
    mockedGetAllCharacters.mockReturnValue(characters)
    mockedBuildCharactersSystemMessage.mockReturnValue('Voici la liste des personnages...')

    expect(buildSystemMessages(STORY_ID)).toEqual([
      { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
      { role: 'system', content: buildStoryWordLimitMessage(100) },
      { role: 'system', content: 'Voici la liste des personnages...' },
    ])
    expect(mockedGetAllCharacters).toHaveBeenCalledWith(STORY_ID)
    expect(mockedBuildCharactersSystemMessage).toHaveBeenCalledWith(characters)
  })

  it('combines the writer prompt and the characters system message, in that order', () => {
    mockedGetWriterPrompt.mockReturnValue('Tu es un auteur de roman policier.')
    mockedBuildCharactersSystemMessage.mockReturnValue('Voici la liste des personnages...')

    expect(buildSystemMessages(STORY_ID)).toEqual([
      { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
      { role: 'system', content: buildStoryWordLimitMessage(100) },
      { role: 'system', content: 'Tu es un auteur de roman policier.' },
      { role: 'system', content: 'Voici la liste des personnages...' },
    ])
  })
})
