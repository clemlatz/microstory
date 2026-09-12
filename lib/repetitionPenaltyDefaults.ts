/**
 * Default/bounds for the repetition_penalty sampling parameter sent to the
 * LLM server on every completion request. Kept in its own module (no
 * server-only imports) so it can be shared between
 * `lib/settingsRepository.ts` (server) and client components without
 * pulling `better-sqlite3` (a server-only dependency) into the browser
 * bundle — mirrors `lib/storyWordLimitDefaults.ts`.
 *
 * 1.0 is "disabled" (the LLM server's own default, and the behavior before
 * this setting existed); 2.0 is the usual upper bound before generated text
 * starts to degrade.
 */
export const DEFAULT_REPETITION_PENALTY = 1.1
export const MIN_REPETITION_PENALTY = 1.0
export const MAX_REPETITION_PENALTY = 2.0
