/**
 * Default max word count for a generated [TEXTE] passage when the user
 * never set one. Kept in its own module (no server-only imports) so it can
 * be shared between `lib/settingsRepository.ts` (server) and client
 * components without pulling `better-sqlite3` into the browser bundle.
 */
export const DEFAULT_MAX_STORY_WORDS = 100
