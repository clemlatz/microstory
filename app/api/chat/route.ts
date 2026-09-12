import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  streamLlmReply,
  countPromptTokens,
  getConfiguredModelName,
  getModelLoadState,
  type ChatCompletionMessage,
} from '@/lib/llmClient'
import { replaceMessages, appendMessage } from '@/lib/messagesRepository'
import { buildSystemMessages } from '@/lib/buildSystemPrompt'
import { getRepetitionPenalty } from '@/lib/settingsRepository'
import { getCurrentPromptMessages } from '@/lib/conversationCompaction'
import { maybeAutoSummarize } from '@/lib/autoSummaryTrigger'
import { touchStory } from '@/lib/storiesRepository'
import { hasRecognizedChannelTags } from '@/lib/channeledContent'
import { requireExistingStoryId } from '@/lib/requestStoryId'
import { logInfo, logWarn } from '@/lib/logger'
import { startGeneration, publishChunk, publishError, finishGeneration } from '@/lib/generationState'
import { createGenerationEventStream } from '@/lib/chatGenerationStream'
import type { Message } from '@/lib/types'

export async function POST(request: Request): Promise<Response> {
  const storyIdResult = requireExistingStoryId(request)
  if ('error' in storyIdResult) return storyIdResult.error
  const { storyId } = storyIdResult

  const body = await request.json()

  if (!Array.isArray(body?.messages)) {
    return NextResponse.json({ error: 'messages must be an array' }, { status: 400 })
  }

  const messages = body.messages as Message[]
  replaceMessages(storyId, messages)

  const baseSystemMessages = buildSystemMessages(storyId)

  const signal = startGeneration(storyId)
  if (!signal) {
    return NextResponse.json({ error: 'a generation is already in progress' }, { status: 409 })
  }

  // Subscribes synchronously (the ReadableStream's `start` callback runs
  // during construction), so it's created before `runGeneration` below is
  // even called.
  const stream = createGenerationEventStream({ storyId, includeBuffer: false })

  // Detached from this request/response on purpose: a page reload only
  // drops this HTTP connection, it must not cancel the LLM call. A freshly
  // loaded client picks the same generation back up via
  // app/api/chat/resume/route.ts, and app/api/chat/stop/route.ts is the one
  // thing allowed to actually cancel it (the "Stop" button).
  runGeneration(storyId, baseSystemMessages, messages, signal)

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
}

async function runGeneration(
  storyId: string,
  baseSystemMessages: ChatCompletionMessage[],
  messages: Message[],
  signal: AbortSignal,
): Promise<void> {
  let fullContent = ''

  try {
    const { systemMessages, promptMessages } = getCurrentPromptMessages(storyId, baseSystemMessages, messages)
    const llmMessages: ChatCompletionMessage[] = [...systemMessages, ...promptMessages]

    // Kicked off now (not awaited) so these two LLM-server round-trips run
    // concurrently with the completion request below rather than delaying
    // `requestStart` — accurate TTFT measurement matters more here than
    // having the token count printed before generation starts.
    const promptTokensPromise = countPromptTokens(
      systemMessages.map((message) => message.content).join('\n\n'),
      promptMessages,
    )
    const modelLoadStatePromise = getModelLoadState()

    const requestStart = Date.now()
    let firstChunkAt: number | null = null

    for await (const chunk of streamLlmReply(llmMessages, signal, {
      repetitionPenalty: getRepetitionPenalty(),
    })) {
      if (firstChunkAt === null) firstChunkAt = Date.now()
      fullContent += chunk
      publishChunk(storyId, chunk)
    }

    if (firstChunkAt !== null) {
      const promptReadingMs = firstChunkAt - requestStart
      const generationMs = Date.now() - firstChunkAt
      const [promptTokens, modelLoadState] = await Promise.all([promptTokensPromise, modelLoadStatePromise])
      logInfo(
        `[chat] model=${getConfiguredModelName()} promptTokens=${promptTokens} ` +
          `systemMessages=${systemMessages.length} verbatimMessages=${promptMessages.length} ` +
          `modelLoaded=${modelLoadState?.loaded ?? 'unknown'} ` +
          `promptReadingMs=${promptReadingMs} generationMs=${generationMs}`,
      )
    }

    if (fullContent.length === 0) {
      // The local LLM server occasionally drops the connection before
      // sending any content (observed with the MLX server under load).
      // Persisting an empty assistant message would leave the UI stuck
      // waiting for a story passage that will never arrive, so surface
      // it as an explicit error instead.
      publishError(storyId, 'The model returned an empty response. Please try again.')
    } else {
      if (!hasRecognizedChannelTags(fullContent)) {
        // The model omitted the [CHAT]/[TEXTE] delimiters entirely, so the
        // whole reply falls back to the chat channel (see
        // `parseChanneledContent`) and any generated fiction it contains
        // will not reach the dedicated panel. Logged to help gauge how
        // often the local model drops the delimiters (see issue #14) —
        // deliberately no content excerpt, since `fullContent` is narrative
        // text and shouldn't be dumped into logs.
        logWarn(
          `[chat] LLM reply contained no [CHAT]/[TEXTE] tags; routed entirely to chat channel (${fullContent.length} chars)`,
        )
      }

      appendMessage(
        { id: randomUUID(), role: 'assistant', content: fullContent, timestamp: Date.now() },
        storyId,
      )
      touchStory(storyId)
      void maybeAutoSummarize(storyId)
    }
  } catch (error) {
    // An AbortError here only ever comes from `stopGeneration()` (this
    // controller is no longer tied to any client request), so it's a
    // deliberate user-initiated stop: discard the partial reply silently,
    // same as any other error path that skips `appendMessage`.
    const stoppedByUser = error instanceof DOMException && error.name === 'AbortError'
    if (!stoppedByUser) {
      const message = error instanceof Error ? error.message : 'LLM stream failed'
      publishError(storyId, message)
    }
  } finally {
    finishGeneration(storyId)
  }
}
