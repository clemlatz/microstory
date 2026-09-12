import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { streamLlmReply, countPromptTokens, getModelContextWindow, getModelLoadState } from './llmClient'
import { estimateTokensFromText } from './tokenEstimate'
import type { Message } from './types'

const messages: Message[] = [{ id: '1', role: 'user', content: 'Bonjour', timestamp: 1000 }]

function sseResponse(lines: string[], options: { ok?: boolean; status?: number } = {}): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line))
      }
      controller.close()
    },
  })
  return { ok: options.ok ?? true, status: options.status ?? 200, body } as Response
}

function errorResponse(status: number, jsonBody: unknown): Response {
  return {
    ok: false,
    status,
    body: null,
    json: () => Promise.resolve(jsonBody),
  } as Response
}

describe('streamLlmReply', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.LLM_SERVER_URL
    delete process.env.LLM_MODEL_NAME
    delete process.env.LLM_API_KEY
  })

  it('yields text deltas parsed from the SSE stream and posts the expected request', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Bon"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"jour"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    )

    const chunks: string[] = []
    for await (const chunk of streamLlmReply(messages)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['Bon', 'jour'])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/v1/chat/completions')
    expect(init).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    })
    expect(init!.headers).not.toHaveProperty('Authorization')
    const parsedBody = JSON.parse(init!.body as string)
    expect(parsedBody).toEqual({
      model: 'local-model',
      messages: [{ role: 'user', content: 'Bonjour' }],
      stream: true,
    })
  })

  it('does not include repetition_penalty in the body when not passed', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(sseResponse(['data: [DONE]\n\n']))

    const generator = streamLlmReply(messages)
    await generator.next()

    const [, init] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse(init!.body as string)
    expect(parsedBody).not.toHaveProperty('repetition_penalty')
  })

  it('sends repetition_penalty in the body when passed', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(sseResponse(['data: [DONE]\n\n']))

    const generator = streamLlmReply(messages, undefined, { repetitionPenalty: 1.3 })
    await generator.next()

    const [, init] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse(init!.body as string)
    expect(parsedBody.repetition_penalty).toBe(1.3)
  })

  it('sends an Authorization header when LLM_API_KEY is set', async () => {
    process.env.LLM_API_KEY = 'secret-key'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(sseResponse(['data: [DONE]\n\n']))

    const generator = streamLlmReply(messages)
    await generator.next()

    const [, init] = mockFetch.mock.calls[0]
    expect(init!.headers).toMatchObject({ Authorization: 'Bearer secret-key' })
  })

  it('falls back to a placeholder model name when LLM_MODEL_NAME is not set', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(sseResponse(['data: [DONE]\n\n']))

    const generator = streamLlmReply(messages)
    await generator.next()

    const [, init] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse(init!.body as string)
    expect(parsedBody.model).toBe('local-model')
  })

  it('throws when the server responds with a non-ok status and no parseable body', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(sseResponse([], { ok: false, status: 500 }))

    const generator = streamLlmReply(messages)
    await expect(generator.next()).rejects.toThrow('500')
  })

  it('includes the server-provided detail when the body has an OpenAI-style error', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(
      errorResponse(401, { error: { message: 'Invalid API key' } }),
    )

    const generator = streamLlmReply(messages)
    await expect(generator.next()).rejects.toThrow('Invalid API key')
  })

  it('includes the server-provided detail when the body has a FastAPI-style string detail', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(errorResponse(422, { detail: 'model field is required' }))

    const generator = streamLlmReply(messages)
    await expect(generator.next()).rejects.toThrow('model field is required')
  })

  it('includes the server-provided detail when the body has a FastAPI-style validation list', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(
      errorResponse(422, {
        detail: [{ loc: ['body', 'messages'], msg: 'field required', type: 'missing' }],
      }),
    )

    const generator = streamLlmReply(messages)
    await expect(generator.next()).rejects.toThrow('field required')
  })

  it('throws when the connection is refused', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValue(new Error('connect ECONNREFUSED'))

    const generator = streamLlmReply(messages)
    await expect(generator.next()).rejects.toThrow('connect ECONNREFUSED')
  })

  it('respects LLM_SERVER_URL and LLM_MODEL_NAME when set', async () => {
    process.env.LLM_SERVER_URL = 'http://custom-host:9000'
    process.env.LLM_MODEL_NAME = 'my-model'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(sseResponse(['data: [DONE]\n\n']))

    const generator = streamLlmReply(messages)
    await generator.next()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://custom-host:9000/v1/chat/completions')
    const parsedBody = JSON.parse(init!.body as string)
    expect(parsedBody.model).toBe('my-model')
  })
})

function jsonResponse(body: unknown, options: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: () => Promise.resolve(body),
  } as Response
}

describe('countPromptTokens', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.LLM_SERVER_URL
    delete process.env.LLM_MODEL_NAME
    delete process.env.LLM_API_KEY
  })

  it('posts the system text and messages to the count_tokens endpoint and returns the count', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(jsonResponse({ input_tokens: 187 }))

    const result = await countPromptTokens('Tu es un assistant.', messages)

    expect(result).toBe(187)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/v1/messages/count_tokens')
    expect(init).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    })
    const parsedBody = JSON.parse(init!.body as string)
    expect(parsedBody).toEqual({
      model: 'local-model',
      system: 'Tu es un assistant.',
      messages: [{ role: 'user', content: 'Bonjour' }],
    })
  })

  it('omits the system field when the system text is empty', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(jsonResponse({ input_tokens: 5 }))

    await countPromptTokens('', messages)

    const [, init] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse(init!.body as string)
    expect(parsedBody).not.toHaveProperty('system')
  })

  it('falls back to a local token estimate on a non-ok response', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(
      jsonResponse({ error: { message: 'Invalid API key' } }, { ok: false, status: 401 }),
    )
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await countPromptTokens('', messages)

    expect(result).toBe(estimateTokensFromText('Bonjour'))
    warnSpy.mockRestore()
  })

  it('falls back to a local token estimate when the request fails outright', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await countPromptTokens('Tu es un assistant.', messages)

    expect(result).toBe(estimateTokensFromText('Tu es un assistant.\nBonjour'))
    warnSpy.mockRestore()
  })
})

describe('getModelContextWindow', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.LLM_SERVER_URL
    delete process.env.LLM_MODEL_NAME
    delete process.env.LLM_API_KEY
    delete process.env.LLM_MODEL_CONTEXT_WINDOW
  })

  it('returns the max_context_window of the configured model', async () => {
    process.env.LLM_MODEL_NAME = 'local-model'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(
      jsonResponse({
        models: [
          { id: 'other-model', max_context_window: 8192 },
          { id: 'local-model', max_context_window: 32768 },
        ],
      }),
    )

    const result = await getModelContextWindow()

    expect(result).toBe(32768)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/v1/models/status')
  })

  it('returns null when the configured model is not found and LLM_MODEL_CONTEXT_WINDOW is not set', async () => {
    process.env.LLM_MODEL_NAME = 'missing-model'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(jsonResponse({ models: [{ id: 'other-model', max_context_window: 8192 }] }))

    const result = await getModelContextWindow()

    expect(result).toBeNull()
  })

  it('falls back to LLM_MODEL_CONTEXT_WINDOW when the configured model is not found', async () => {
    process.env.LLM_MODEL_NAME = 'missing-model'
    process.env.LLM_MODEL_CONTEXT_WINDOW = '65536'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(jsonResponse({ models: [{ id: 'other-model', max_context_window: 8192 }] }))

    const result = await getModelContextWindow()

    expect(result).toBe(65536)
  })

  it('returns null on a non-ok status response when LLM_MODEL_CONTEXT_WINDOW is not set', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(jsonResponse({ detail: 'not found' }, { ok: false, status: 404 }))

    const result = await getModelContextWindow()

    expect(result).toBeNull()
  })

  it('falls back to LLM_MODEL_CONTEXT_WINDOW on a non-ok status response', async () => {
    process.env.LLM_MODEL_CONTEXT_WINDOW = '16000'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(jsonResponse({ detail: 'not found' }, { ok: false, status: 404 }))

    const result = await getModelContextWindow()

    expect(result).toBe(16000)
  })

  it('returns null when the status request fails outright and LLM_MODEL_CONTEXT_WINDOW is not set', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValue(new Error('connect ECONNREFUSED'))

    const result = await getModelContextWindow()

    expect(result).toBeNull()
  })
})

describe('getModelLoadState', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.LLM_SERVER_URL
    delete process.env.LLM_MODEL_NAME
    delete process.env.LLM_API_KEY
  })

  it('returns { loaded: true, isLoading: false } when the configured model is loaded', async () => {
    process.env.LLM_MODEL_NAME = 'local-model'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(
      jsonResponse({
        models: [
          { id: 'other-model', max_context_window: 8192, loaded: false, is_loading: false },
          { id: 'local-model', max_context_window: 32768, loaded: true, is_loading: false },
        ],
      }),
    )

    const result = await getModelLoadState()

    expect(result).toEqual({ loaded: true, isLoading: false })
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/v1/models/status')
  })

  it('returns { loaded: false, isLoading: true } when the configured model is loading', async () => {
    process.env.LLM_MODEL_NAME = 'local-model'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(
      jsonResponse({
        models: [{ id: 'local-model', max_context_window: 32768, loaded: false, is_loading: true }],
      }),
    )

    const result = await getModelLoadState()

    expect(result).toEqual({ loaded: false, isLoading: true })
  })

  it('returns null when the configured model is absent from the response', async () => {
    process.env.LLM_MODEL_NAME = 'missing-model'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(
      jsonResponse({
        models: [{ id: 'other-model', max_context_window: 8192, loaded: true, is_loading: false }],
      }),
    )

    const result = await getModelLoadState()

    expect(result).toBeNull()
  })

  it('returns null on a non-ok status response', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue(jsonResponse({ detail: 'unauthorized' }, { ok: false, status: 401 }))

    const result = await getModelLoadState()

    expect(result).toBeNull()
  })

  it('returns null when the status request fails outright', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValue(new Error('connect ECONNREFUSED'))

    const result = await getModelLoadState()

    expect(result).toBeNull()
  })
})
