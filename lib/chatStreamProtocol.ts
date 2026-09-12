export type ChatStreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

export function encodeChatStreamEvent(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`)
}
