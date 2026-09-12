/**
 * Whether LLM-assisted writing (manuscript, chat, text generation) is
 * exposed in the UI at all — issue #83. Defaults to enabled; set
 * `LLM_WRITING_ENABLED=false` to hide it entirely (the "Manuscrit" button
 * from the story overview, and with it the manuscript/chat surface and its
 * writing/LLM config panel sections, since none of those are reachable any
 * other way — see `components/StoryPageClient.tsx`).
 */
export function isLlmWritingEnabled(): boolean {
  return process.env.LLM_WRITING_ENABLED !== 'false'
}
