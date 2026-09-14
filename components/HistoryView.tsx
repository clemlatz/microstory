'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchHistory, type HistoryResponse } from '@/lib/historyApi'
import { updateConversationSummary } from '@/lib/conversationSummariesApi'
import { parseChanneledContent } from '@/lib/channeledContent'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Message, ConversationSummaryRecord } from '@/lib/types'

type HistoryItem =
  | { kind: 'message'; message: Message }
  | { kind: 'summary'; summary: ConversationSummaryRecord }

/**
 * Restricts the view to exactly what `getCurrentPromptMessages`
 * (lib/conversationCompaction.ts) would actually send to the LLM on the
 * next turn (issue #60): the active summary — the most recently created
 * one, only when its cutoff still matches the settings' current cutoff —
 * plus every message strictly after that cutoff. Older content (replaced
 * summaries, messages folded into a previous summary) is out of scope
 * entirely rather than shown dimmed, since none of it is part of what's
 * actually sent any more.
 */
function buildHistoryItems(
  messages: Message[],
  summaries: ConversationSummaryRecord[],
  activeCutoffId: string | null,
): HistoryItem[] {
  const lastSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null
  const activeSummary =
    lastSummary && lastSummary.cutoffMessageId === activeCutoffId ? lastSummary : null

  const activeCutoffIndex = activeCutoffId
    ? messages.findIndex((message) => message.id === activeCutoffId)
    : -1

  const items: HistoryItem[] = []
  if (activeSummary) {
    items.push({ kind: 'summary', summary: activeSummary })
  }
  messages.forEach((message, index) => {
    if (index > activeCutoffIndex) {
      items.push({ kind: 'message', message })
    }
  })
  return items
}

const CONTAINER_CLASSNAME =
  'min-h-0 flex-1 overflow-y-auto bg-[#fdfbf6] px-6 pt-10 pb-16 dark:bg-stone-950'

/**
 * One summary item, with its "Modifier" affordance (issue #42): clicking it
 * swaps the read-only `<p>` for a `<textarea>` seeded with the current
 * content, mirroring `StoryView`'s manual-summary edit pattern (issue #31)
 * — an auto-growing textarea, saved explicitly rather than on blur.
 * Saving calls `lib/conversationSummariesApi.ts`'s `updateConversationSummary`
 * and, on success, reports the updated record up via `onSaved` so
 * `HistoryView` can fold it back into `data.summaries` (keeping the page in
 * sync without a full refetch); the item then reverts to read-only showing
 * the saved content.
 *
 * Since issue #60, `HistoryView` only ever renders this for the *active*
 * summary (a non-active/historical summary is out of scope for the view
 * entirely) — so there's no "isActive" toggle any more, it's always
 * highlighted and always labelled as sent to the next turn. Editing a
 * historical summary (issue #42's original scope) is no longer possible
 * from here as a result.
 */
function SummaryItem({
  storyId,
  summary,
  onSaved,
}: {
  storyId: string
  summary: ConversationSummaryRecord
  onSaved: (updated: ConversationSummaryRecord) => void
}) {
  const { t } = useLocale()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(summary.content)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!isEditing) return
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [isEditing, draft])

  const highlightClassName = 'border-amber-300 text-stone-700 dark:border-amber-700 dark:text-stone-300'

  function handleStartEdit() {
    setDraft(summary.content)
    setError(null)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setDraft(summary.content)
    setError(null)
  }

  async function handleSave() {
    const trimmed = draft.trim()
    if (trimmed.length === 0 || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateConversationSummary(storyId, summary.id, trimmed)
      onSaved(updated)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      data-testid="history-summary-item"
      className={`border-l-2 py-1.5 pl-4 font-sans text-sm italic ${highlightClassName}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2 not-italic">
        <p className="font-sans text-xs font-medium tracking-wide text-stone-400 uppercase dark:text-stone-500">
          {t('history.summaryLabel', {
            type: summary.type === 'manual' ? t('history.typeManual') : t('history.typeAuto'),
          })}
        </p>
        {!isEditing ? (
          <button
            type="button"
            data-testid="history-summary-edit-button"
            onClick={handleStartEdit}
            className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 font-sans text-xs font-medium text-stone-400 underline hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
          >
            {t('common.edit')}
          </button>
        ) : null}
      </div>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            data-testid="history-summary-edit-textarea"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={isSaving}
            className="w-full resize-none rounded-md border border-stone-300 bg-white/60 p-2 font-sans text-sm text-stone-700 not-italic focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-300"
            rows={3}
          />
          {error ? (
            <p className="font-sans text-xs text-red-500 not-italic">{error}</p>
          ) : null}
          <div className="flex items-center gap-2 not-italic">
            <button
              type="button"
              data-testid="history-summary-save-button"
              onClick={handleSave}
              disabled={isSaving || draft.trim().length === 0}
              className="inline-flex min-h-11 items-center rounded-md bg-amber-600 px-3 font-sans text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-700"
            >
              {isSaving ? t('history.saving') : t('common.save')}
            </button>
            <button
              type="button"
              data-testid="history-summary-cancel-button"
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex min-h-11 items-center rounded-md px-3 font-sans text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap">{summary.content}</p>
      )}
    </div>
  )
}

/**
 * One user-prompt item, with its own "Modifier" affordance (issue #68):
 * mirrors `SummaryItem`'s isEditing/draft/error/auto-grow pattern, but
 * saving here doesn't PUT anything in place — editing a prompt means
 * discarding it and everything that followed it, then generating a fresh
 * turn from the edited text. `onSave` is `HistoryView`'s
 * `onEditHistoryPrompt` prop, wired by `ChatWindow` to slice `messages` up
 * to (not including) this one and re-run the same `sendPrompt` machinery
 * `handleEditPrompt` already uses for the last turn's prompt — so this
 * component only owns the textarea UI, not the generation itself. There is
 * no local error/saving state tied to the network call: as soon as `onSave`
 * is invoked, `ChatWindow` closes the history view and switches to the
 * manuscript to show the new generation start, so this item never lives
 * long enough to need to report a failure back into itself.
 */
function PromptItem({
  message,
  onSave,
}: {
  message: Message
  onSave: (messageId: string, newContent: string) => void
}) {
  const { t } = useLocale()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!isEditing) return
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [isEditing, draft])

  function handleStartEdit() {
    setDraft(message.content)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setDraft(message.content)
  }

  function handleSave() {
    const trimmed = draft.trim()
    if (trimmed.length === 0) return
    onSave(message.id, trimmed)
  }

  return (
    <div
      data-testid="history-prompt-item"
      className="border-l-2 border-amber-300 bg-amber-50/40 py-1.5 pr-3 pl-4 text-stone-700 dark:border-amber-700 dark:bg-amber-950/10 dark:text-stone-300"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-sans text-xs font-medium tracking-wide text-stone-400 uppercase dark:text-stone-500">
          {t('history.promptLabel')}
        </p>
        {!isEditing ? (
          <button
            type="button"
            data-testid="history-prompt-edit-button"
            onClick={handleStartEdit}
            className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 font-sans text-xs font-medium text-stone-400 underline hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
          >
            {t('common.edit')}
          </button>
        ) : null}
      </div>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            data-testid="history-prompt-edit-textarea"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="w-full resize-none rounded-md border border-stone-300 bg-white/60 p-2 font-sans text-sm text-stone-700 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-300"
            rows={3}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="history-prompt-save-button"
              onClick={handleSave}
              disabled={draft.trim().length === 0}
              className="inline-flex min-h-11 items-center rounded-md bg-amber-600 px-3 font-sans text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-700"
            >
              {t('common.save')}
            </button>
            <button
              type="button"
              data-testid="history-prompt-cancel-button"
              onClick={handleCancel}
              className="inline-flex min-h-11 items-center rounded-md px-3 font-sans text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <p className="font-sans text-sm whitespace-pre-wrap text-stone-700 dark:text-stone-300">
          {message.content}
        </p>
      )}
    </div>
  )
}

function CenteredMessage({
  testId,
  onOpenResetConfirm,
  onSummarize,
  isSummarizeDisabled,
  children,
}: {
  testId?: string
  onOpenResetConfirm?: () => void
  onSummarize?: () => void
  isSummarizeDisabled?: boolean
  children: ReactNode
}) {
  return (
    <div className={CONTAINER_CLASSNAME}>
      <p
        data-testid={testId}
        className="mx-auto max-w-2xl text-center font-serif text-base text-stone-400 italic sm:text-lg dark:text-stone-600"
      >
        {children}
      </p>
      {onOpenResetConfirm ? (
        <div className="mx-auto mt-6 flex max-w-2xl justify-center gap-2">
          {onSummarize ? (
            <SummarizeButton onSummarize={onSummarize} isDisabled={isSummarizeDisabled ?? true} />
          ) : null}
          <ResetButton onOpenResetConfirm={onOpenResetConfirm} />
        </div>
      ) : null}
    </div>
  )
}

/**
 * The "Effacer" button (issue #46; label shortened to "Effacer" by issue
 * #67 now that it sits next to `SummarizeButton` at the bottom of this
 * view): moved here from ChatWindow's header, with a visible text label
 * alongside its icon rather than the header's old icon-only trash button —
 * since what it resets (the whole conversation) is exactly what this view
 * shows. Clicking it doesn't reset directly; it calls `onOpenResetConfirm`,
 * which ChatWindow still owns (along with the `ConfirmDialog` and
 * `handleReset` themselves) unchanged.
 */
function ResetButton({ onOpenResetConfirm }: { onOpenResetConfirm: () => void }) {
  const { t } = useLocale()
  return (
    <button
      data-testid="reset-button"
      type="button"
      className="flex min-h-11 items-center gap-2 rounded-lg px-3 font-sans text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-900 dark:hover:text-stone-300"
      onClick={onOpenResetConfirm}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.62 12.4A2 2 0 0 1 15.39 21H8.61a2 2 0 0 1-1.99-1.6L6 7m4 4v6m4-6v6"
        />
      </svg>
      {t('history.resetButton')}
    </button>
  )
}

/**
 * The "Résumer" button (issue #67): moved here from ChatWindow's header,
 * next to `ResetButton`, since it now lives at the bottom of this view
 * rather than in the app header. `onSummarize`/`isSummarizing`/`isDisabled`
 * are all still owned by ChatWindow (`handleSummarize` and the streaming
 * state it drives) — this component only renders the trigger.
 */
function SummarizeButton({
  onSummarize,
  isDisabled,
}: {
  onSummarize: () => void
  isDisabled: boolean
}) {
  const { t } = useLocale()
  return (
    <button
      data-testid="summarize-button"
      type="button"
      className="flex min-h-11 items-center gap-2 rounded-lg px-3 font-sans text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-stone-400 dark:text-stone-500 dark:hover:bg-stone-900 dark:hover:text-stone-300 dark:disabled:hover:text-stone-500"
      disabled={isDisabled}
      onClick={onSummarize}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
      </svg>
      {t('history.summarizeButton')}
    </button>
  )
}

/**
 * The read-only "Historique" view (issue #36): replaces `StoryView` (and,
 * per the issue's clarification, the floating "Continuer" input and
 * "Réécrire" pill — there is no writing surface here) in the main area
 * while active. Shows, in chronological order, exactly what would actually
 * be sent to the LLM on the next turn (see
 * lib/conversationCompaction.ts's `getCurrentPromptMessages`) — the active
 * summary, if any (the one currently persisted in
 * `settings.conversationSummary`/`conversationSummaryCutoffId`), plus every
 * user prompt / assistant passage (and any [CHAT] remark alongside it — see
 * lib/channeledContent.ts) strictly after its cutoff. Since issue #60,
 * older content (a replaced summary, messages folded into a previous
 * summary) isn't shown at all any more — it used to be interleaved and
 * dimmed, but none of it is part of what's actually sent, and the view kept
 * growing noisier as the conversation did. One side effect: editing a
 * *historical* (non-active) summary, previously possible from here (issue
 * #42), is no longer possible — only the active summary, when shown, still
 * has its "Modifier" affordance.
 *
 * Also hosts the "Effacer" button (`ResetButton`, issue #46) and, since
 * issue #67, the "Résumer" button (`SummarizeButton`, moved here from
 * ChatWindow's header) side by side, below the last item of the
 * chronological list — or, when the history is empty, below the
 * empty-state message instead, so both controls stay reachable even with
 * nothing to show yet. `ResetButton` used to be an icon-only button in
 * ChatWindow's header, but moved here — with a visible text label
 * alongside its icon — since what it resets (the whole conversation) is
 * exactly what this view shows; `SummarizeButton` similarly used to be an
 * icon-only button next to the history toggle in the header, moved here
 * since summarizing is naturally tied to reviewing the history it
 * condenses. Clicking "Effacer" doesn't reset directly; it calls
 * `onOpenResetConfirm`, which ChatWindow still owns (along with the
 * `ConfirmDialog` and `handleReset` themselves) unchanged — `onSummarize`
 * is likewise still ChatWindow's own `handleSummarize`.
 *
 * Since this view stays mounted through a reset (only the `ConfirmDialog`
 * closes — `HistoryView` itself is never unmounted/remounted by that flow on
 * its own), its own `data` state doesn't get any of the benefit of
 * `ChatWindow` clearing its own `messages`/`activeSummary` state: without
 * help, it would keep showing whatever it fetched on mount, stale, until a
 * manual reload (issue #65). `ChatWindow` fixes this by forcing a genuine
 * remount instead: it owns `historyResetSignal`, a counter bumped inside
 * `handleReset` right after `resetConversation()` succeeds, and passes it as
 * this element's `key` — React discards the old instance and mounts a fresh
 * one on every reset, so `data`/`error` naturally start over at their
 * initial (loading) state and this effect's `fetchHistory()` call reruns
 * from scratch, mirroring how the rest of the app (`syncWithServer`,
 * `refreshContextUsage`, `refreshActiveSummary`) stays synced with the
 * server rather than trusting stale local state.
 *
 * Since issue #68, every rendered `PromptItem` also has its own "Modifier"
 * affordance (not just the last prompt, which is separately editable from
 * the manuscript via `StoryView`'s `EditPromptControl`) — saving it calls
 * `onEditHistoryPrompt(messageId, newContent)`, which `ChatWindow` wires to
 * drop that message and everything after it, then generate a fresh turn
 * from the edited text via the same `sendPrompt` machinery, closing this
 * view so the new generation streams live on the manuscript.
 */
export function HistoryView({
  storyId,
  onOpenResetConfirm,
  onSummarize,
  isSummarizeDisabled,
  onEditHistoryPrompt,
}: {
  storyId: string
  onOpenResetConfirm: () => void
  onSummarize: () => void
  isSummarizeDisabled: boolean
  onEditHistoryPrompt: (messageId: string, newContent: string) => void
}) {
  const { t } = useLocale()
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchHistory(storyId)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('common.unknownError'))
      })
    return () => {
      cancelled = true
    }
  }, [storyId, t])

  const items = useMemo(
    () => (data ? buildHistoryItems(data.messages, data.summaries, data.activeCutoffId) : []),
    [data],
  )

  // Folds an edited summary (see SummaryItem) back into `data.summaries`
  // rather than refetching the whole history — the edit already persisted
  // server-side (and, if it was the active summary, so did the settings
  // copy used by the next turn's prompt), this just keeps the page in sync
  // with what was saved.
  function handleSummarySaved(updated: ConversationSummaryRecord) {
    setData((current) =>
      current
        ? {
            ...current,
            summaries: current.summaries.map((summary) =>
              summary.id === updated.id ? updated : summary,
            ),
          }
        : current,
    )
  }

  // Once the history has loaded and rendered, jump the scroll container to
  // the bottom: the most recent content (last passage, active summary) is
  // what the user actually wants to see first, not the oldest history at
  // the top (issue #40). Runs after paint so `scrollHeight` already
  // reflects the freshly rendered items.
  useEffect(() => {
    if (items.length === 0) return
    const container = containerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [items])

  if (error) {
    return (
      <div className={CONTAINER_CLASSNAME}>
        <p data-testid="history-view-error" className="mx-auto max-w-2xl text-center font-sans text-sm text-red-500">
          {error}
        </p>
      </div>
    )
  }

  if (!data) {
    return <CenteredMessage testId="history-view-loading">{t('history.loading')}</CenteredMessage>
  }

  if (items.length === 0) {
    return (
      <CenteredMessage
        testId="history-view-empty"
        onOpenResetConfirm={onOpenResetConfirm}
        onSummarize={onSummarize}
        isSummarizeDisabled={isSummarizeDisabled}
      >
        {t('history.empty')}
      </CenteredMessage>
    )
  }

  return (
    <div data-testid="history-view" ref={containerRef} className={CONTAINER_CLASSNAME}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        {items.map((item) => {
          if (item.kind === 'summary') {
            return (
              <SummaryItem
                key={`summary-${item.summary.id}`}
                storyId={storyId}
                summary={item.summary}
                onSaved={handleSummarySaved}
              />
            )
          }

          // Every item this view now renders is in scope for the next LLM
          // call (see buildHistoryItems), so prompts/passages always get
          // the highlighted styling — there's no dimmed/out-of-scope
          // variant left to render (issue #60).
          const { message } = item

          if (message.role === 'user') {
            return <PromptItem key={message.id} message={message} onSave={onEditHistoryPrompt} />
          }

          const { chat, story } = parseChanneledContent(message.content)
          if (chat.trim().length === 0 && story.trim().length === 0) return null

          return (
            <div
              key={message.id}
              data-testid="history-passage-item"
              className="rounded-md bg-amber-50/80 px-3 py-2 dark:bg-amber-950/30"
            >
              {chat.trim().length > 0 ? (
                <p className="mb-2 font-sans text-sm whitespace-pre-wrap text-stone-500 italic dark:text-stone-500">
                  {chat.trim()}
                </p>
              ) : null}
              {story.trim().length > 0 ? (
                <p className="font-serif text-base leading-relaxed whitespace-pre-wrap text-stone-900 sm:text-lg dark:text-stone-100">
                  {story}
                </p>
              ) : null}
            </div>
          )
        })}
        <div className="flex justify-center gap-2 pt-6">
          <SummarizeButton onSummarize={onSummarize} isDisabled={isSummarizeDisabled} />
          <ResetButton onOpenResetConfirm={onOpenResetConfirm} />
        </div>
      </div>
    </div>
  )
}
