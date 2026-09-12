import type { ChatStreamEvent } from './chatStreamProtocol'

/**
 * Tracks in-flight LLM generations, keyed by story id, independently of any
 * particular HTTP request's lifetime. `app/api/chat/route.ts` starts a
 * generation with its own AbortController — not `request.signal` — so a page
 * reload, which only drops that specific connection, no longer cancels the
 * LLM call. `app/api/chat/resume/route.ts` lets a freshly loaded client
 * discover an in-progress generation for a given story, replay what has been
 * produced so far, and keep following it live. Keying by story id means a
 * generation for one story never interferes with another's.
 */

type Listener = (event: ChatStreamEvent) => void

type StoryGenerationState = {
  buffer: string
  controller: AbortController
  listeners: Set<Listener>
}

const generations = new Map<string, StoryGenerationState>()

export function isGenerationInProgress(storyId: string): boolean {
  return generations.has(storyId)
}

export function getBufferedContent(storyId: string): string {
  return generations.get(storyId)?.buffer ?? ''
}

/** Returns null if a generation is already in progress for this story. */
export function startGeneration(storyId: string): AbortSignal | null {
  if (generations.has(storyId)) return null
  const controller = new AbortController()
  generations.set(storyId, { buffer: '', controller, listeners: new Set() })
  return controller.signal
}

export function publishChunk(storyId: string, text: string): void {
  const state = generations.get(storyId)
  if (!state) return
  state.buffer += text
  for (const listener of state.listeners) listener({ type: 'chunk', text })
}

export function publishError(storyId: string, message: string): void {
  const state = generations.get(storyId)
  if (!state) return
  for (const listener of state.listeners) listener({ type: 'error', message })
}

export function finishGeneration(storyId: string): void {
  const state = generations.get(storyId)
  if (!state) return
  for (const listener of state.listeners) listener({ type: 'done' })
  state.listeners.clear()
  generations.delete(storyId)
}

/** Aborts the in-progress generation for this story. Returns false if none was running. */
export function stopGeneration(storyId: string): boolean {
  const state = generations.get(storyId)
  if (!state) return false
  state.controller.abort()
  return true
}

export function subscribeToGeneration(storyId: string, listener: Listener): () => void {
  const state = generations.get(storyId)
  if (!state) return () => {}
  state.listeners.add(listener)
  return () => state.listeners.delete(listener)
}
