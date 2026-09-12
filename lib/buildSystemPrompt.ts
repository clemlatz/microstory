import type { ChatCompletionMessage } from './llmClient'
import { getWriterPrompt, getMaxStoryWords } from './settingsRepository'
import { getAllCharacters, buildCharactersSystemMessage } from './charactersRepository'
import { CHANNEL_SYSTEM_PROMPT } from './channelSystemPrompt'
import { buildStoryWordLimitMessage } from './storyWordLimitPrompt'

export function buildSystemMessages(storyId: string): ChatCompletionMessage[] {
  const messages: ChatCompletionMessage[] = [
    { role: 'system', content: CHANNEL_SYSTEM_PROMPT },
    { role: 'system', content: buildStoryWordLimitMessage(getMaxStoryWords()) },
  ]

  const writerPrompt = getWriterPrompt(storyId)
  if (writerPrompt) messages.push({ role: 'system', content: writerPrompt })

  const charactersSystemMessage = buildCharactersSystemMessage(getAllCharacters(storyId))
  if (charactersSystemMessage) messages.push({ role: 'system', content: charactersSystemMessage })

  return messages
}
