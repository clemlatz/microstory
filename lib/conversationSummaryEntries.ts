import { parseChanneledContent } from './channeledContent'
import type { Message } from './types'

/**
 * Maps messages to the {role, content} shape the summarization prompt
 * (lib/conversationSummaryPrompt.ts) expects: a user message keeps its
 * trimmed raw content, an assistant message contributes only its [TEXTE]
 * story portion — each dropped if empty after trimming/parsing.
 * Chronological order is preserved. Shared by the manual "Résumer" route
 * (app/api/summarize/route.ts) and the automatic trigger
 * (lib/autoSummaryTrigger.ts).
 */
export function toSummaryEntries(messages: Message[]): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .map((message) => {
      if (message.role === 'user') {
        const prompt = message.content.trim()
        return prompt.length > 0 ? { role: 'user' as const, content: prompt } : null
      }
      const story = parseChanneledContent(message.content).story
      return story.length > 0 ? { role: 'assistant' as const, content: story } : null
    })
    .filter((entry): entry is { role: 'user' | 'assistant'; content: string } => entry !== null)
}
