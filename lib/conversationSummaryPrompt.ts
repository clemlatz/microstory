import type { ChatCompletionMessage } from './llmClient'

const MAX_SUMMARY_WORDS = 2000

const SYSTEM_PROMPT =
  `You are a conversation-summarizing tool. You are given an existing summary of the story (which may be empty) and the oldest exchanges of a collaborative writing conversation. Produce an updated summary, in prose, that merges the old summary with these new exchanges: characters, key events, ongoing narrative threads, unresolved tensions, important established facts. The updated summary must fit within ${MAX_SUMMARY_WORDS} words maximum, regardless of the size of the existing summary or the new exchanges — condense and rewrite rather than stacking the old sentences as-is; trim details that have become secondary to make room for elements still useful for the rest of the story. Preserve the register and level of explicitness of the source text, including for sexual or explicit scenes: do not sanitize them, do not euphemize them, and do not replace them with vague or prudish phrasing — the summary must stay faithful to the tone and intensity of the original. Reply with only the summary, with no tags or commentary.`

export function buildConversationSummaryMessages(
  previousSummary: string,
  messagesToSummarize: ChatCompletionMessage[],
): ChatCompletionMessage[] {
  const transcript = messagesToSummarize.map((message) => `${message.role}: ${message.content}`).join('\n\n')
  const userContent = previousSummary
    ? `Existing summary:\n${previousSummary}\n\nNew exchanges to integrate:\n${transcript}`
    : `Exchanges to summarize:\n${transcript}`

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ]
}
