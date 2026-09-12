import { getDb } from './db'
import { DEFAULT_MAX_STORY_WORDS } from './storyWordLimitDefaults'
import {
  DEFAULT_REPETITION_PENALTY,
  MIN_REPETITION_PENALTY,
  MAX_REPETITION_PENALTY,
} from './repetitionPenaltyDefaults'
import { DEFAULT_VERBATIM_WINDOW_WORDS } from './verbatimWindowDefaults'
import { DEFAULT_AUTO_SUMMARY_THRESHOLD_WORDS } from './autoSummaryThresholdDefaults'

export { DEFAULT_MAX_STORY_WORDS, DEFAULT_VERBATIM_WINDOW_WORDS, DEFAULT_AUTO_SUMMARY_THRESHOLD_WORDS }

const MAX_STORY_WORDS_KEY = 'maxStoryWords'
const REPETITION_PENALTY_KEY = 'repetitionPenalty'
const VERBATIM_WINDOW_WORDS_KEY = 'verbatimWindowWords'
const AUTO_SUMMARY_THRESHOLD_WORDS_KEY = 'autoSummaryThresholdWords'

type SettingRow = {
  value: string
}

function getSetting(key: string): string {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | SettingRow
    | undefined
  return row?.value ?? ''
}

function setSetting(key: string, value: string): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = @value',
  ).run({ key, value })
}

/**
 * Max number of words the model is asked to write in the [TEXTE] channel per
 * turn (a "best effort" instruction, see `lib/buildSystemPrompt.ts` — there is
 * no server-side truncation). Stored as a plain (unencrypted) numeric string:
 * unlike the writer prompt or characters, it isn't user-authored narrative
 * content, so it isn't part of the encrypted-at-rest columns.
 */
export function getMaxStoryWords(): number {
  const stored = getSetting(MAX_STORY_WORDS_KEY)
  const parsed = Number.parseInt(stored, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_STORY_WORDS
}

export function setMaxStoryWords(maxStoryWords: number): void {
  setSetting(MAX_STORY_WORDS_KEY, String(maxStoryWords))
}

/**
 * Word budget for the verbatim context window sent to the LLM on every
 * request (see lib/verbatimWindow.ts's splitByWordCount, used by
 * lib/conversationCompaction.ts). Stored as a plain (unencrypted) numeric
 * string, like maxStoryWords: it's a technical parameter, not narrative
 * content.
 */
export function getVerbatimWindowWords(): number {
  const stored = getSetting(VERBATIM_WINDOW_WORDS_KEY)
  const parsed = Number.parseInt(stored, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_VERBATIM_WINDOW_WORDS
}

export function setVerbatimWindowWords(verbatimWindowWords: number): void {
  setSetting(VERBATIM_WINDOW_WORDS_KEY, String(verbatimWindowWords))
}

/**
 * Word threshold that triggers the automatic summary (lib/autoSummaryTrigger.ts):
 * once the pending (unsummarized) content reaches this many words, the
 * content outside the verbatim window is folded into the rolling summary.
 * Stored as a plain (unencrypted) numeric string, like maxStoryWords and
 * verbatimWindowWords: it's a technical parameter, not narrative content.
 */
export function getAutoSummaryThresholdWords(): number {
  const stored = getSetting(AUTO_SUMMARY_THRESHOLD_WORDS_KEY)
  const parsed = Number.parseInt(stored, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_AUTO_SUMMARY_THRESHOLD_WORDS
}

export function setAutoSummaryThresholdWords(autoSummaryThresholdWords: number): void {
  setSetting(AUTO_SUMMARY_THRESHOLD_WORDS_KEY, String(autoSummaryThresholdWords))
}

/**
 * `repetition_penalty` sampling parameter sent to the LLM server on every
 * completion request (see `lib/llmClient.ts`'s `streamLlmReply`), to
 * discourage the model from looping on the same words/phrasings on long
 * replies. Stored as a plain (unencrypted) numeric string, like
 * maxStoryWords: it's a sampling knob, not narrative content.
 */
export function getRepetitionPenalty(): number {
  const stored = getSetting(REPETITION_PENALTY_KEY)
  const parsed = Number.parseFloat(stored)
  return Number.isFinite(parsed) && parsed >= MIN_REPETITION_PENALTY && parsed <= MAX_REPETITION_PENALTY
    ? parsed
    : DEFAULT_REPETITION_PENALTY
}

export function setRepetitionPenalty(repetitionPenalty: number): void {
  setSetting(REPETITION_PENALTY_KEY, String(repetitionPenalty))
}

const WRITER_PROMPT_KEY = 'writerPrompt'
const CONVERSATION_SUMMARY_KEY = 'conversationSummary'
const CONVERSATION_SUMMARY_CUTOFF_KEY = 'conversationSummaryCutoffId'
const CURRENT_STORY_ID_KEY = 'currentStoryId'

function scopedKey(storyId: string, key: string): string {
  return `${storyId}:${key}`
}

/**
 * The free-form system prompt applied to every subsequent LLM call for a
 * given story ("write like an author of..."). Scoped per story via a
 * `<storyId>:writerPrompt` key prefix (no schema change).
 */
export function getWriterPrompt(storyId: string): string {
  return getSetting(scopedKey(storyId, WRITER_PROMPT_KEY))
}

export function setWriterPrompt(storyId: string, prompt: string): void {
  setSetting(scopedKey(storyId, WRITER_PROMPT_KEY), prompt)
}

/**
 * The rolling summary covering everything older than `cutoffId` (a message
 * id) that the compaction feature (see lib/conversationCompaction.ts) keeps
 * out of the verbatim prompt. Scoped per story via a `<storyId>:...` key
 * prefix.
 */
export function getConversationSummary(storyId: string): { summary: string; cutoffId: string | null } {
  const summary = getSetting(scopedKey(storyId, CONVERSATION_SUMMARY_KEY))
  const cutoffId = getSetting(scopedKey(storyId, CONVERSATION_SUMMARY_CUTOFF_KEY))
  return { summary, cutoffId: cutoffId || null }
}

export function setConversationSummary(storyId: string, summary: string, cutoffId: string): void {
  setSetting(scopedKey(storyId, CONVERSATION_SUMMARY_KEY), summary)
  setSetting(scopedKey(storyId, CONVERSATION_SUMMARY_CUTOFF_KEY), cutoffId)
}

export function clearConversationSummary(storyId: string): void {
  setSetting(scopedKey(storyId, CONVERSATION_SUMMARY_KEY), '')
  setSetting(scopedKey(storyId, CONVERSATION_SUMMARY_CUTOFF_KEY), '')
}

/** The id of the story currently shown/edited by the UI (global, unscoped). */
export function getCurrentStoryId(): string | null {
  const stored = getSetting(CURRENT_STORY_ID_KEY)
  return stored || null
}

export function setCurrentStoryId(id: string): void {
  setSetting(CURRENT_STORY_ID_KEY, id)
}
