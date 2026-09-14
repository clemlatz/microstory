'use client'

import { useLocale } from '@/lib/i18n/LocaleContext'

type StoryViewProps = {
  passages: string[]
  isGenerating?: boolean
  isSummarizing?: boolean
  displayOverride?: string | null
  canEditPrompt?: boolean
  onStartEditPrompt?: () => void
  pendingPrompt?: string | null
  generationDraft?: string | null
  currentPrompt?: string | null
}

/**
 * The "Modifier le prompt" control shown below the last passage: a small
 * pill button that, instead of opening its own inline field, asks the
 * caller (`onStartEditPrompt`, wired to ChatWindow's
 * `handleStartEditPrompt`) to switch the manuscript's floating "Continuer"
 * input into edit-prompt mode — same `MessageInput` instance, same spot on
 * screen, prefilled with the actual last prompt text (issue #63, replacing
 * the earlier rewrite-by-instruction control). This control only ever
 * renders alongside the single passage StoryView shows (the last one), so
 * there is no separate "which passage" concept to wire up — it structurally
 * cannot act on an earlier passage.
 */
function EditPromptControl({ onStartEditPrompt }: { onStartEditPrompt: () => void }) {
  const { t } = useLocale()
  return (
    <button
      data-testid="edit-prompt-button"
      type="button"
      aria-label={t('storyView.editPrompt')}
      title={t('storyView.editPrompt')}
      className="mt-3 flex min-h-11 items-center gap-1.5 rounded-full border border-[#e7e1d5] px-3 font-sans text-xs text-stone-400 hover:bg-[#f6f1e7] hover:text-stone-600 disabled:pointer-events-none disabled:opacity-40 dark:border-stone-700 dark:text-stone-500 dark:hover:bg-stone-900 dark:hover:text-stone-300"
      onClick={onStartEditPrompt}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0 0 14.2 3.2M19.5 9A8 8 0 0 0 5.3 5.8"
        />
      </svg>
      {t('storyView.editPrompt')}
    </button>
  )
}

/**
 * The main manuscript view: only the latest fiction passage (the `[TEXTE]`
 * channel — see lib/channeledContent.ts) is rendered, serif-set on a
 * paper-like background. Earlier passages stay in `passages` (persisted and
 * sent to the LLM as context) but are never shown — there is no history
 * toggle. This is the primary surface of the app; the chat channel is only
 * ever shown read-only, interleaved in the "Historique" view (see
 * HistoryView). `isSummarizing` drives a small "En train de résumer…"
 * indicator below the last passage (which stays visible underneath it,
 * unlike the pending-generation case above) for as long as no summary
 * content has streamed in yet (`!isShowingSummary`) — shown alongside, not
 * instead of, the equivalent label in the manuscript's floating input
 * itself (see ChatWindow's `FloatingActivityBar`). `isSummarizing` also
 * still gates the "Modifier le prompt" button's visibility.
 * `isGenerating` is still passed and still gates the passage text itself
 * (via `displayOverride` below) and the button's visibility, just no
 * indicator of its own anymore. `displayOverride`,
 * when set, replaces the rendered text of that last passage (used for the
 * on-demand summary — see ChatWindow) without touching `passages` itself, so
 * the underlying text stays what gets persisted and sent to the LLM. It is
 * rendered in a visually distinct style (sans-serif, labelled, boxed) from
 * the manuscript's serif prose, since it is a factual recap rather than
 * fiction text. Once the summary has finished streaming in (`isSummarizing`
 * false), it renders as plain, read-only text — same typographic treatment
 * as before. It is persisted as the current compaction summary automatically
 * as soon as it finishes generating (see ChatWindow's `handleSummarize`),
 * with no further action required here — there is no "Utiliser comme
 * contexte" button anymore (issue #44). Editing a summary — including the
 * currently active one — is only available from the "Historique" view now
 * (see HistoryView's `SummaryItem`), not from here.
 *
 * `currentPrompt`, when provided (ChatWindow passes `lastUserPromptForEdit`),
 * is rendered above the last passage in the same "Prompt" block style used
 * for `pendingPrompt` below, and stays visible once the reply has finished
 * streaming in — unlike `pendingPrompt`, which is only shown while that one
 * generation is in flight. `onStartEditPrompt`, when provided, renders a
 * "Modifier le prompt" control directly below that prompt block (see
 * `EditPromptControl`) that switches the manuscript's floating input into
 * edit-prompt mode rather than opening its own field (issue #63) — see
 * ChatWindow's `handleStartEditPrompt`/`handleEditPrompt` for what happens
 * next. `canEditPrompt` gates whether the control is shown at all (e.g.
 * hidden while there is nothing to edit yet, or while some other
 * generation/summary is already in flight).
 *
 * `pendingPrompt`/`generationDraft` (issue #48): while a normal "Continuer"
 * generation — or an edit-prompt-triggered one (issue #63), which goes
 * through the exact same path — is in flight (`pendingPrompt` non-null, set
 * by ChatWindow the instant the message is sent), the previous last passage
 * is hidden *immediately* — not just once the reply arrives — and replaced
 * by the just-sent prompt text (labelled "Prompt", same treatment as
 * HistoryView's prompt blocks) followed by `generationDraft`, the new
 * passage's `[TEXTE]` text as it streams in (starting empty, growing chunk
 * by chunk exactly like the manuscript's own text normally does). This is
 * the generation-time analogue of `displayOverride` above: a one-way,
 * display-only swap that never touches `passages` itself. Once the
 * generation ends, ChatWindow clears `pendingPrompt` and the view reverts to
 * showing `passages[passages.length - 1]` as usual (by then equal to what
 * `generationDraft` was showing). Takes priority over `displayOverride` (the
 * two are not expected to be active at once). While `generationDraft` is
 * still empty (nothing streamed in yet), a "En train de réfléchir…"
 * indicator is shown under the pending prompt in place of the (otherwise
 * empty) passage text, disappearing as soon as the first chunk arrives.
 */
export function StoryView({
  passages,
  isGenerating = false,
  isSummarizing = false,
  displayOverride = null,
  canEditPrompt = false,
  onStartEditPrompt,
  pendingPrompt = null,
  generationDraft = null,
  currentPrompt = null,
}: StoryViewProps) {
  const { t } = useLocale()
  const isShowingPendingGeneration = pendingPrompt !== null
  const isShowingSummary = !isShowingPendingGeneration && passages.length > 0 && displayOverride !== null
  const isShowingCurrentPrompt = !isShowingPendingGeneration && !isShowingSummary && currentPrompt !== null
  const isShowingThinkingIndicator = isShowingPendingGeneration && !generationDraft
  const lastPassage = isShowingPendingGeneration
    ? (generationDraft ?? '')
    : passages.length > 0
      ? (displayOverride ?? passages[passages.length - 1])
      : null
  const hasNothingToShow = lastPassage === null && !isShowingCurrentPrompt

  return (
    <div
      data-testid="story-view"
      className="min-h-0 flex-1 overflow-y-auto bg-[#fdfbf6] px-6 pt-10 pb-40 dark:bg-stone-950"
    >
      <div className="mx-auto w-full max-w-2xl">
        {hasNothingToShow ? (
          <p
            data-testid="story-view-empty"
            className="mt-16 text-center font-serif text-base text-stone-400 italic sm:text-lg dark:text-stone-600"
          >
            {t('storyView.empty')}
          </p>
        ) : (
          <div>
            {isShowingPendingGeneration ? (
              <div className="mb-4 border-l-2 border-amber-300 bg-amber-50/40 py-1.5 pr-3 pl-4 dark:border-amber-700 dark:bg-amber-950/10">
                <p
                  data-testid="story-pending-prompt-label"
                  className="mb-1 font-sans text-xs font-medium tracking-wide text-stone-400 uppercase dark:text-stone-500"
                >
                  {t('storyView.promptLabel')}
                </p>
                <p
                  data-testid="story-pending-prompt"
                  className="font-sans text-sm whitespace-pre-wrap text-stone-700 dark:text-stone-300"
                >
                  {pendingPrompt}
                </p>
              </div>
            ) : null}
            {isShowingCurrentPrompt ? (
              <div className="mb-4 border-l-2 border-amber-300 bg-amber-50/40 py-1.5 pr-3 pl-4 dark:border-amber-700 dark:bg-amber-950/10">
                <p
                  data-testid="story-current-prompt-label"
                  className="mb-1 font-sans text-xs font-medium tracking-wide text-stone-400 uppercase dark:text-stone-500"
                >
                  {t('storyView.promptLabel')}
                </p>
                <p
                  data-testid="story-current-prompt"
                  className="font-sans text-sm whitespace-pre-wrap text-stone-700 dark:text-stone-300"
                >
                  {currentPrompt}
                </p>
                {!isGenerating && !isSummarizing && canEditPrompt && onStartEditPrompt ? (
                  <EditPromptControl onStartEditPrompt={onStartEditPrompt} />
                ) : null}
              </div>
            ) : null}
            {isShowingSummary ? (
              <div className="border-l-2 border-stone-300 py-1 pl-4 dark:border-stone-700">
                <p
                  data-testid="story-summary-label"
                  className="mb-1.5 font-sans text-xs font-medium tracking-wide text-stone-400 uppercase dark:text-stone-500"
                >
                  {t('storyView.summaryLabel')}
                </p>
                <p
                  data-testid="story-passage"
                  className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-stone-600 italic sm:text-base dark:text-stone-400"
                >
                  {lastPassage}
                </p>
              </div>
            ) : isShowingThinkingIndicator ? (
              <p
                data-testid="story-thinking-indicator"
                className="animate-pulse font-sans text-sm text-stone-400 italic dark:text-stone-500"
              >
                {t('storyView.thinking')}
              </p>
            ) : lastPassage !== null ? (
              <p
                data-testid="story-passage"
                className="[text-wrap:pretty] font-serif text-lg leading-relaxed whitespace-pre-wrap text-stone-900 sm:text-xl dark:text-stone-100"
              >
                {lastPassage}
              </p>
            ) : null}
            {isSummarizing && !isShowingSummary ? (
              <p
                data-testid="story-summarizing-indicator"
                className="mt-3 animate-pulse font-sans text-sm text-stone-400 italic dark:text-stone-500"
              >
                {t('storyView.summarizing')}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
