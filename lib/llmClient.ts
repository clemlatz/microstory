import { estimateTokensFromText } from './tokenEstimate'
import { logWarn } from './logger'

export type ChatCompletionMessage = {
  role: string
  content: string
}

function resolveLlmServerUrl(): string {
  return process.env.LLM_SERVER_URL ?? 'http://localhost:8000'
}

function resolveLlmModelName(): string {
  return process.env.LLM_MODEL_NAME ?? 'local-model'
}

function resolveLlmApiKey(): string | undefined {
  return process.env.LLM_API_KEY
}

type ChatCompletionChunk = {
  choices?: Array<{ delta?: { content?: string } }>
}

function buildHeaders(): Record<string, string> {
  const apiKey = resolveLlmApiKey()
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  }
}

type FastApiValidationItem = { msg?: unknown }

async function extractErrorDetail(response: Response): Promise<string | undefined> {
  let data: unknown

  try {
    data = await response.json()
  } catch {
    return undefined
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>

    if (record.error && typeof record.error === 'object') {
      const message = (record.error as Record<string, unknown>).message
      if (typeof message === 'string') return message
    }
    if (typeof record.error === 'string') return record.error

    if (typeof record.detail === 'string') return record.detail
    if (Array.isArray(record.detail)) {
      const messages = record.detail
        .map((item) => (item as FastApiValidationItem)?.msg)
        .filter((msg): msg is string => typeof msg === 'string')
      if (messages.length > 0) return messages.join('; ')
    }

    if (typeof record.message === 'string') return record.message
  }

  return undefined
}

export type StreamLlmReplyOptions = {
  /**
   * Sent to the LLM server as `repetition_penalty` when provided, to
   * discourage the model from looping on the same words/phrasings (see
   * `lib/settingsRepository.ts`'s `getRepetitionPenalty`). Omitted entirely
   * when not provided, so callers that don't pass it get the LLM server's
   * own default.
   */
  repetitionPenalty?: number
}

export async function* streamLlmReply(
  messages: ChatCompletionMessage[],
  signal?: AbortSignal,
  options?: StreamLlmReplyOptions,
): AsyncGenerator<string, void, void> {
  const modelName = resolveLlmModelName()

  const response = await fetch(`${resolveLlmServerUrl()}/v1/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      model: modelName,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      stream: true,
      ...(options?.repetitionPenalty !== undefined
        ? { repetition_penalty: options.repetitionPenalty }
        : {}),
    }),
    signal,
  })

  if (!response.ok) {
    const detail = await extractErrorDetail(response)
    throw new Error(
      detail
        ? `LLM server request failed with status ${response.status}: ${detail}`
        : `LLM server request failed with status ${response.status}`,
    )
  }

  if (!response.body) {
    throw new Error('LLM server response has no body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue

      const data = trimmed.slice('data:'.length).trim()
      if (data === '[DONE]') return

      const parsed = JSON.parse(data) as ChatCompletionChunk
      const delta = parsed.choices?.[0]?.delta?.content
      if (delta) yield delta
    }
  }
}

type TokenCountResponse = {
  input_tokens: number
}

/**
 * Resolves the exact input token count from /v1/messages/count_tokens, or
 * falls back to a local chars/4 estimate (estimateTokensFromText) when that
 * endpoint is unreachable or errors — a hosted OpenAI-compatible provider
 * (e.g. OpenRouter) typically doesn't expose it at all. Never rejects for
 * this reason: precision doesn't matter for the context gauge / compaction
 * trigger, only availability does.
 */
export async function countPromptTokens(
  systemText: string,
  messages: ChatCompletionMessage[],
): Promise<number> {
  try {
    const response = await fetch(`${resolveLlmServerUrl()}/v1/messages/count_tokens`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        model: resolveLlmModelName(),
        ...(systemText ? { system: systemText } : {}),
        messages: messages.map((message) => ({ role: message.role, content: message.content })),
      }),
    })

    if (!response.ok) {
      const detail = await extractErrorDetail(response)
      throw new Error(
        detail
          ? `LLM server request failed with status ${response.status}: ${detail}`
          : `LLM server request failed with status ${response.status}`,
      )
    }

    const data = (await response.json()) as TokenCountResponse
    return data.input_tokens
  } catch (error) {
    logWarn('[llmClient] /v1/messages/count_tokens unavailable; falling back to a local token estimate', error)
    const combinedText = [systemText, ...messages.map((message) => message.content)]
      .filter(Boolean)
      .join('\n')
    return estimateTokensFromText(combinedText)
  }
}

type ModelStatusResponse = {
  models: Array<{
    id: string
    max_context_window: number
    loaded?: boolean
    is_loading?: boolean
  }>
}

/**
 * Returns null instead of throwing on any failure (network error or
 * non-ok response) — this is the one endpoint that a hosted OpenAI-compatible
 * provider (e.g. OpenRouter) typically doesn't expose at all, so its absence
 * must be a normal, silent "status unavailable" case rather than an error
 * that breaks the context gauge / LLM status panel.
 */
async function fetchModelStatus(): Promise<ModelStatusResponse | null> {
  try {
    const response = await fetch(`${resolveLlmServerUrl()}/v1/models/status`, {
      headers: buildHeaders(),
    })
    if (!response.ok) return null
    return (await response.json()) as ModelStatusResponse
  } catch {
    return null
  }
}

function resolveConfiguredContextWindow(): number | null {
  const raw = process.env.LLM_MODEL_CONTEXT_WINDOW
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Resolves the configured model's max context window from
 * /v1/models/status, falling back to LLM_MODEL_CONTEXT_WINDOW when that
 * endpoint is unavailable or doesn't know the model — and to null when
 * neither source has an answer (the caller treats null as "unavailable",
 * never as an error; see lib/conversationCompaction.ts and
 * app/api/context-usage/route.ts).
 */
export async function getModelContextWindow(): Promise<number | null> {
  const data = await fetchModelStatus()
  const modelName = resolveLlmModelName()
  const model = data?.models.find((entry) => entry.id === modelName)

  if (model) return model.max_context_window

  return resolveConfiguredContextWindow()
}

export type ModelLoadState = {
  loaded: boolean
  isLoading: boolean
}

/**
 * Returns the configured model's load state ({ loaded, isLoading }) as
 * reported by /v1/models/status, or null when that model isn't present in
 * the server's response (e.g. server hasn't discovered it yet, or it's
 * otherwise unavailable) — unlike getModelContextWindow, this doesn't throw
 * on a missing model since "absent from the response" is itself a state the
 * UI needs to render (unavailable) rather than an error.
 */
export async function getModelLoadState(): Promise<ModelLoadState | null> {
  const data = await fetchModelStatus()
  const modelName = resolveLlmModelName()
  const model = data?.models.find((entry) => entry.id === modelName)

  if (!model) return null

  return { loaded: Boolean(model.loaded), isLoading: Boolean(model.is_loading) }
}

export function getConfiguredModelName(): string {
  return resolveLlmModelName()
}
