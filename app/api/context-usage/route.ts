import { NextResponse } from 'next/server'
import { getAllMessages } from '@/lib/messagesRepository'
import { buildSystemMessages } from '@/lib/buildSystemPrompt'
import { getCurrentPromptMessages, messagesAfterCutoff } from '@/lib/conversationCompaction'
import { getConversationSummary, getAutoSummaryThresholdWords } from '@/lib/settingsRepository'
import { countWords } from '@/lib/verbatimWindow'
import { countPromptTokens, getConfiguredModelName, getModelContextWindow, getModelLoadState } from '@/lib/llmClient'
import { requireExistingStoryId } from '@/lib/requestStoryId'

export async function GET(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error
  const { storyId } = storyIdResult

  const baseSystemMessages = buildSystemMessages(storyId)
  const messages = getAllMessages(storyId)
  const { systemMessages, promptMessages } = getCurrentPromptMessages(storyId, baseSystemMessages, messages)
  const { cutoffId } = getConversationSummary(storyId)
  const pendingWords = messagesAfterCutoff(messages, cutoffId).reduce(
    (sum, message) => sum + countWords(message.content),
    0,
  )

  try {
    const [usedTokens, maxTokens, modelLoadState] = await Promise.all([
      countPromptTokens(
        systemMessages.map((message) => message.content).join('\n\n'),
        promptMessages,
      ),
      getModelContextWindow(),
      getModelLoadState(),
    ])

    return NextResponse.json({
      usedTokens,
      maxTokens,
      pendingWords,
      autoSummaryThresholdWords: getAutoSummaryThresholdWords(),
      modelName: getConfiguredModelName(),
      modelLoaded: modelLoadState?.loaded ?? null,
      modelIsLoading: modelLoadState?.isLoading ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute context usage' },
      { status: 502 },
    )
  }
}
