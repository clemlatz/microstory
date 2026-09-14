'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { StoryView } from './StoryView'
import { HistoryView } from './HistoryView'
import { MessageInput } from './MessageInput'
import { ConfigPanel } from './ConfigPanel'
import { WriterPromptPanel } from './WriterPromptPanel'
import { LlmStatusPanel } from './LlmStatusPanel'
import { ConfirmDialog } from './ConfirmDialog'
import { ContextGauge } from './ContextGauge'
import { LogoutButton } from './LogoutButton'
import { fetchAiResponse, fetchMessages, resetConversation, resumeAiResponse, stopGeneration } from '@/lib/aiResponse'
import { fetchContextUsage, type ContextUsage } from '@/lib/contextUsageApi'
import { fetchSummary } from '@/lib/summarizeApi'
import {
  fetchActiveConversationSummary,
  persistConversationSummary,
  type ActiveConversationSummary,
} from '@/lib/conversationSummaryApi'
import { parseChanneledContent } from '@/lib/channeledContent'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Message } from '@/lib/types'

/**
 * Replaces the floating "Continuer" input outright while a generation
 * (including one triggered by an edited prompt, issue #63) is streaming
 * (issue #39) — same visual slot (same rounded pill), textarea and
 * submit/cancel buttons swapped for a pulsing label plus a single "Stop"
 * button, rather than showing an editable-looking field with nothing to
 * type while the LLM is replying. Mirrors the pill styling `MessageInput`'s
 * floating variant uses so the swap reads as one continuous control rather
 * than two different components trading places.
 */
// `onStop` is optional: the manual "Résumer" flow (issue #54) has no
// cancellation mechanism of its own (unlike a normal generation,
// `fetchSummary` isn't wired to an AbortController), so that case renders
// this bar with no Stop button rather than one that does nothing.
function FloatingActivityBar({
  label,
  onStop,
  labelTestId,
  stopTestId,
}: {
  label: string
  onStop?: () => void
  labelTestId: string
  stopTestId: string
}) {
  const { t } = useLocale()
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#e7e1d5] bg-[#fffdf8]/95 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95">
      <p
        data-testid={labelTestId}
        className="flex-1 animate-pulse px-2 py-1.5 text-stone-500 italic dark:text-stone-400"
      >
        {label}
      </p>
      {onStop ? (
        <button
          data-testid={stopTestId}
          type="button"
          className="shrink-0 rounded-xl bg-stone-700 px-4 py-2 text-white dark:bg-stone-600"
          onClick={onStop}
        >
          {t('chatWindow.stop')}
        </button>
      ) : null}
    </div>
  )
}

function createMessage(role: Message['role'], content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now(),
  }
}

/**
 * The manuscript/chat surface for a story — a section reached through
 * `StoryNavDrawer` (issue #13) rather than shown by default. `onOpenNav`,
 * when provided, renders a button in the header that toggles that nav
 * open/closed — the same entry point `StoryHomeView` uses for every other
 * section,
 * replacing this component's former standalone `onBackToOverview`/
 * `stories-toggle` navigation. It's optional so existing standalone
 * renders/tests of this component keep working unchanged.
 */
export function ChatWindow({
  storyId,
  onOpenNav,
}: {
  storyId: string
  onOpenNav?: () => void
}) {
  const { t } = useLocale()
  const CONFIG_PANEL_SECTIONS = useMemo(
    () => [
      { id: 'writing', label: t('configPanel.writingTab'), content: <WriterPromptPanel storyId={storyId} /> },
      { id: 'llm', label: 'LLM', content: <LlmStatusPanel storyId={storyId} /> },
    ],
    [storyId, t],
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [isWaitingForFirstChunk, setIsWaitingForFirstChunk] = useState(false)
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false)
  // Whether the read-only "Historique" view (issue #36) is shown instead of
  // the manuscript. When true, StoryView, the floating "Continuer" input,
  // and the "Réécrire" pill are all hidden — the history view is purely for
  // reading, there is no writing surface over it (per the issue's
  // clarification).
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(null)
  const [summarizedPassage, setSummarizedPassage] = useState<string | null>(null)
  // The current compaction summary and its cutoff message id (issue #47),
  // refetched alongside context usage — used to detect when that summary has
  // become more recent than the manuscript's last passage (an automatic
  // compaction, or a summary persisted from the "Historique" view/a previous
  // session, none of which touch `summarizedPassage`'s local, session-only
  // override).
  const [activeSummary, setActiveSummary] = useState<ActiveConversationSummary | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  // Surfaces a failed "Résumer" attempt (e.g. nothing new to summarize, or
  // the LLM call itself failing) — previously only logged via
  // console.error, which left the button appearing to do nothing with no
  // visible feedback at all.
  const [summarizeError, setSummarizeError] = useState<string | null>(null)
  // Whether the floating "Continuer" input is switched into edit-prompt mode
  // (issue #63, replacing the earlier rewrite-by-instruction mode): the same
  // MessageInput instance, prefilled with the actual text of the last
  // prompt sent, rather than a separate instruction field.
  const [isEditPromptMode, setIsEditPromptMode] = useState(false)
  // The prompt just sent via the floating "Continuer" input (issue #48),
  // shown above the manuscript in place of the previous last passage for the
  // whole duration of the generation it triggered — set the instant
  // `handleSend` fires, cleared once that generation ends (success, error,
  // or abort). See StoryView's `pendingPrompt` doc comment.
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const lastStoryMessageIdRef = useRef<string | null>(null)
  // Bumped inside `handleReset` (issue #65): passed as the `<HistoryView>`
  // element's `key` below, so React fully remounts it on every reset instead
  // of leaving it mounted with its stale local state — `HistoryView` stays
  // mounted through a reset otherwise (only the ConfirmDialog closes), so
  // without this it kept showing the old conversation until a manual
  // reload. See HistoryView's own doc comment.
  const [historyResetSignal, setHistoryResetSignal] = useState(0)

  // Each assistant message's raw content carries [CHAT]/[TEXTE] delimiters
  // (see lib/channeledContent.ts): re-derive the fiction text accumulated
  // across the whole conversation for the manuscript view. Re-parsing the
  // full buffer on every render (rather than tracking channel state
  // incrementally) is what keeps this correct while a reply is still
  // streaming in.
  const storyPassages = useMemo(
    () =>
      messages
        .filter((message) => message.role === 'assistant')
        .map((message) => parseChanneledContent(message.content).story)
        .filter((story) => story.length > 0),
    [messages],
  )

  // Identity of the message currently backing the manuscript's last passage
  // (see the render-phase reset below) — the id of the last assistant
  // message whose parsed `.story` is non-empty, or null when there is no
  // passage yet. Tracking this id, rather than `storyPassages.length`, is
  // what actually distinguishes "a new passage started" from any other
  // reason `messages` might change shape.
  const lastStoryMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message.role === 'assistant' && parseChanneledContent(message.content).story.length > 0) {
        return message.id
      }
    }
    return null
  }, [messages])

  // The last user prompt, if there is one to edit — what "Modifier"
  // prefills the floating input with. Two cases: a complete (user,
  // assistant) last turn (the normal case), or a dangling last user
  // message with no reply at all — which happens when the user hits
  // "Stop" before the very first chunk arrived, so `sendPrompt` never got
  // to create the assistant message (see `handleStop`'s doc comment).
  // `null` when there is no prompt to edit (e.g. no messages yet).
  const lastUserPromptForEdit = useMemo(() => {
    const last = messages[messages.length - 1]
    if (!last) return null
    if (last.role === 'user') return last.content
    const secondLast = messages[messages.length - 2]
    if (last.role === 'assistant' && secondLast && secondLast.role === 'user') return secondLast.content
    return null
  }, [messages])

  // The generating indicator should only show up between passages — once
  // the next passage's text starts streaming in, the text itself is the
  // "it's working" signal, so the indicator would be redundant clutter.
  const isWaitingForNextPassage = useMemo(() => {
    if (!isAiTyping) return false
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') return true
    return parseChanneledContent(lastMessage.content).story.length === 0
  }, [isAiTyping, messages])

  // The new passage's [TEXTE] text as it streams in (issue #48), passed to
  // StoryView as `generationDraft` alongside `pendingPrompt` — re-derived
  // from the raw accumulated buffer of whichever message is currently last
  // (the optimistic assistant message `sendPrompt`'s `appendChunk` appends
  // to) so a stray [CHAT] remark never leaks into it. Starts out as ''
  // before the model has emitted any [TEXTE] content yet.
  const generationDraft = useMemo(() => {
    if (!isAiTyping) return null
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') return ''
    return parseChanneledContent(lastMessage.content).story
  }, [isAiTyping, messages])

  // Refetches the persisted conversation and catches up on any generation
  // still running server-side. Used both on mount and (below) when the tab
  // regains visibility, since server-side generation is detached from any
  // one HTTP connection (see app/api/chat/route.ts's `runGeneration` doc
  // comment) — if this tab's own streaming fetch dies while backgrounded
  // (throttled/suspended tabs can drop or error out a long-lived fetch,
  // especially on Safari/iOS) the reply keeps being written server-side
  // regardless, but this tab's local state is left showing whatever it had
  // before that fetch failed (issue: switching tabs mid-generation and back
  // showed the previous passage instead of the new one, until a manual
  // reload). Re-running this exact resync is what a reload actually
  // achieves, without the reload.
  function syncWithServer() {
    refreshContextUsage()
    refreshActiveSummary()
    // Only load the plain persisted history when nothing was resumed:
    // `resumeInProgressGeneration` already refetches messages itself once
    // the resumed stream finishes, and firing this unconditionally would
    // race it — if this plain fetch resolves after that final refetch, it
    // silently overwrites the correctly-resumed state (indicator + new
    // passage) with the stale pre-generation history (missing the reply,
    // since it isn't persisted until the generation completes).
    resumeInProgressGeneration().then((didResume) => {
      if (didResume) return
      fetchMessages(storyId)
        .then((loaded) => setMessages(loaded))
        .catch((error) => {
          console.error('Failed to load conversation history', error)
        })
    })
  }

  useEffect(() => {
    syncWithServer()
  }, [])

  // Only resyncs when this tab isn't already tracking an active generation
  // of its own (`abortControllerRef.current` set by `sendPrompt`) — that
  // path is presumably healthy and streaming fine, and resyncing over it
  // would race a second `/api/chat/resume` subscription against it.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      if (abortControllerRef.current) return
      syncWithServer()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // If a generation was still running server-side when this page loaded
  // (e.g. the previous load reloaded mid-reply — see
  // app/api/chat/resume/route.ts), pick it back up: show the same typing
  // state handleSend would, append chunks as they arrive, and once it
  // finishes, refetch history so the optimistic message is replaced by the
  // real persisted one.
  async function resumeInProgressGeneration(): Promise<boolean> {
    const assistantMessageId = crypto.randomUUID()
    let didResume = false

    function appendChunk(text: string) {
      setIsWaitingForFirstChunk(false)
      setMessages((prev) => {
        const existingIndex = prev.findIndex((message) => message.id === assistantMessageId)
        if (existingIndex === -1) {
          return [...prev, { id: assistantMessageId, role: 'assistant', content: text, timestamp: Date.now() }]
        }
        return prev.map((message, index) =>
          index === existingIndex ? { ...message, content: message.content + text } : message,
        )
      })
    }

    try {
      const result = await resumeAiResponse(storyId, () => {
        didResume = true
        setIsAiTyping(true)
        setIsWaitingForFirstChunk(true)
      }, appendChunk)

      if (result.resumed) {
        setMessages(await fetchMessages(storyId))
      }
    } catch (error) {
      console.error('Failed to resume the in-progress AI response', error)
      if (didResume) {
        setMessages((prev) => prev.filter((message) => message.id !== assistantMessageId))
      }
    } finally {
      if (didResume) {
        setIsAiTyping(false)
        setIsWaitingForFirstChunk(false)
        refreshContextUsage()
        refreshActiveSummary()
      }
    }

    return didResume
  }

  // A summary shown for the current passage is a one-way, display-only
  // override (see StoryView's `displayOverride`): as soon as a new passage
  // starts, it no longer applies and the manuscript reverts to showing the
  // real text as usual. Adjusted during render (React's recommended pattern
  // for resetting state when a value changes) rather than in an effect, to
  // avoid the extra render an effect-based reset would cause.
  //
  // This compares `lastStoryMessageId` (the id of the message backing the
  // displayed passage) rather than `storyPassages.length` (issue #35): a
  // raw count is only an indirect proxy for "a new passage started" and can
  // coincidentally read the same, or differently, across renders that have
  // nothing to do with a new passage actually appearing — the message id is
  // the one thing that's guaranteed to change exactly when, and only when,
  // the manuscript's last passage really does become a new message.
  if (lastStoryMessageIdRef.current !== lastStoryMessageId) {
    lastStoryMessageIdRef.current = lastStoryMessageId
    if (summarizedPassage !== null) setSummarizedPassage(null)
  }

  async function refreshContextUsage() {
    try {
      setContextUsage(await fetchContextUsage(storyId))
    } catch (error) {
      console.error('Failed to load context usage', error)
    }
  }

  async function refreshActiveSummary() {
    try {
      setActiveSummary(await fetchActiveConversationSummary(storyId))
    } catch (error) {
      console.error('Failed to load the active conversation summary', error)
    }
  }

  // Issue #47: whether the currently active compaction summary now covers
  // (i.e. its cutoff message is at or after) the message backing the
  // manuscript's last passage — "at or after" because `cutoffId` is
  // inclusive of the messages it summarizes (see
  // lib/conversationCompaction.ts's `messagesAfterCutoff`, which excludes
  // the cutoff message itself from what's still sent verbatim), so a cutoff
  // equal to the last passage's own message already makes that passage
  // stale, not just one strictly past it. Both ids are looked up by
  // position in the full `messages` array (chronological), which is the
  // only ordering available client-side.
  const isSummaryNewerThanLastPassage = useMemo(() => {
    const cutoffId = activeSummary?.cutoffId ?? null
    if (cutoffId === null || lastStoryMessageId === null) return false
    const cutoffIndex = messages.findIndex((message) => message.id === cutoffId)
    const lastStoryIndex = messages.findIndex((message) => message.id === lastStoryMessageId)
    if (cutoffIndex === -1 || lastStoryIndex === -1) return false
    return cutoffIndex >= lastStoryIndex
  }, [activeSummary, lastStoryMessageId, messages])

  // What StoryView actually shows in place of the last passage: the local,
  // still-being-edited "Résumer" preview takes priority when present
  // (`summarizedPassage`), otherwise fall back to the persisted active
  // summary once it's detected as more recent than the last passage.
  const manuscriptDisplayOverride =
    summarizedPassage !== null
      ? summarizedPassage
      : isSummaryNewerThanLastPassage
        ? (activeSummary?.summary ?? null)
        : null

  async function sendPrompt(baseMessages: Message[], content: string) {
    const userMessage = createMessage('user', content)
    const updatedMessages = [...baseMessages, userMessage]
    setMessages(updatedMessages)
    setIsAiTyping(true)
    setIsWaitingForFirstChunk(true)
    setPendingPrompt(content)

    const assistantMessageId = crypto.randomUUID()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    function appendChunk(text: string) {
      setIsWaitingForFirstChunk(false)
      setMessages((prev) => {
        const existingIndex = prev.findIndex((message) => message.id === assistantMessageId)
        if (existingIndex === -1) {
          return [...prev, { id: assistantMessageId, role: 'assistant', content: text, timestamp: Date.now() }]
        }
        return prev.map((message, index) =>
          index === existingIndex ? { ...message, content: message.content + text } : message,
        )
      })
    }

    try {
      await fetchAiResponse(storyId, updatedMessages, appendChunk, abortController.signal)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // The user interrupted the generation: keep whatever was received
        // so far (the prompt and the partial passage stay on screen,
        // editable via "Modifier" — see `lastUserPromptForEdit`) rather
        // than discarding it. Nothing was persisted server-side (the fetch
        // was aborted before /api/chat's stream completed), so this is
        // purely local state; it's only made permanent if the user sends
        // or edits again from here (`sendPrompt`'s next call replaces the
        // whole persisted history with whatever `messages` holds by then).
      } else {
        const errorContent =
          error instanceof Error && error.message
            ? t('chatWindow.errorPrefix', { message: error.message })
            : t('chatWindow.fallbackError')
        setMessages((prev) => [
          ...prev.filter((message) => message.id !== assistantMessageId),
          createMessage('assistant', errorContent),
        ])
      }
    } finally {
      abortControllerRef.current = null
      setIsAiTyping(false)
      setIsWaitingForFirstChunk(false)
      setPendingPrompt(null)
      refreshContextUsage()
      refreshActiveSummary()
    }
  }

  async function handleSend(content: string) {
    await sendPrompt(messages, content)
  }

  /**
   * "Modifier" (issue #63, replacing the earlier "Réécrire"
   * rewrite-by-instruction flow): drops the last turn — the one
   * `lastUserPromptForEdit` reads from — and generates a fresh one from the
   * edited text, through the exact same path as a normal send. That last
   * turn is usually a complete (user, assistant) pair, but can also be a
   * single dangling user message with no reply at all (stopped before the
   * first chunk arrived — see `sendPrompt`'s `AbortError` handling), hence
   * dropping only the last message in that case. Since /api/chat replaces
   * the entire persisted message table with whatever array it's sent (see
   * lib/messagesRepository.ts's `replaceMessages`), dropping it here is
   * enough to delete it permanently — no dedicated server route or
   * repository function needed.
   */
  async function handleEditPrompt(content: string) {
    setIsEditPromptMode(false)
    const last = messages[messages.length - 1]
    const baseMessages = last?.role === 'assistant' ? messages.slice(0, -2) : messages.slice(0, -1)
    await sendPrompt(baseMessages, content)
  }

  /**
   * "Modifier" on a prompt in "Historique" (issue #68): unlike
   * `handleEditPrompt` (which always drops exactly the last turn),
   * this can target any prompt shown in the history — find its index in
   * the full `messages` array and drop it plus everything after it, then
   * generate a fresh turn from the edited text through the same
   * `sendPrompt` used everywhere else. Also switches back to the
   * manuscript (`isHistoryOpen(false)`) so the new generation streams live,
   * per the same UX `handleStartEditPrompt`'s button already offers for the
   * last turn.
   */
  async function handleEditHistoryPrompt(messageId: string, newContent: string) {
    const index = messages.findIndex((message) => message.id === messageId)
    const baseMessages = index === -1 ? messages : messages.slice(0, index)
    setIsHistoryOpen(false)
    await sendPrompt(baseMessages, newContent)
  }

  async function handleStop() {
    abortControllerRef.current?.abort()
    try {
      await stopGeneration(storyId)
    } catch (error) {
      console.error('Failed to stop the in-progress generation', error)
    }
  }

  // Generates the on-demand summary and, as soon as it finishes streaming
  // in, persists it as the current compaction summary automatically (issue
  // #44) — there is no separate "Utiliser comme contexte" action anymore.
  // The cutoff is resolved server-side to the very last message in history,
  // since the summary already covers the entire manuscript (see
  // app/api/conversation-summary/route.ts). Editing a summary afterwards
  // (including this now-active one) only happens from the "Historique" view
  // (see HistoryView's `SummaryItem`), not here.
  async function handleSummarize() {
    if (storyPassages.length === 0) return

    setSummarizeError(null)
    setIsSummarizing(true)
    let fullSummary = ''
    try {
      await fetchSummary(storyId, (chunk) => {
        fullSummary += chunk
        setSummarizedPassage((prev) => (prev ?? '') + chunk)
      })
    } catch (error) {
      console.error('Failed to summarize the story text', error)
      setSummarizedPassage(null)
      setIsSummarizing(false)
      setSummarizeError(error instanceof Error && error.message ? error.message : t('chatWindow.fallbackError'))
      return
    }
    setIsSummarizing(false)

    if (fullSummary.trim().length === 0) return
    try {
      await persistConversationSummary(storyId, fullSummary)
      refreshContextUsage()
      refreshActiveSummary()
    } catch (error) {
      console.error('Failed to persist the summary as compaction context', error)
    }
  }

  /**
   * Switches the floating "Continuer" input into edit-prompt mode (issue
   * #63) — the "Modifier le prompt" button's click handler. Guarded the
   * same way `canEditPrompt` (passed to StoryView) already gates the
   * button's visibility, so this is mostly a defensive backstop.
   */
  function handleStartEditPrompt() {
    if (isAiTyping || isSummarizing || lastUserPromptForEdit === null) return
    setIsEditPromptMode(true)
  }

  /**
   * The floating input's cancel control while in edit-prompt mode: bails
   * back to normal "Continuer" mode without sending anything. Only ever
   * reachable before submitting — once a generation is actually streaming,
   * `MessageInput` itself is replaced by the activity indicator.
   */
  function handleCancelEditPrompt() {
    setIsEditPromptMode(false)
  }

  async function handleReset() {
    setIsResetConfirmOpen(false)
    try {
      await resetConversation(storyId)
      setMessages([])
      refreshContextUsage()
      setActiveSummary(null)
      setHistoryResetSignal((count) => count + 1)
    } catch (error) {
      console.error('Failed to reset the conversation', error)
    }
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#fdfbf6] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="flex w-full shrink-0 items-center justify-between p-3.5 px-5">
        <div className="flex items-center gap-2">
          <button
            data-testid="config-panel-toggle"
            type="button"
            aria-label={t('chatWindow.configAria')}
            className="rounded-lg p-3 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-stone-900"
            onClick={() => setIsConfigPanelOpen((open) => !open)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/logo-lotus.png" alt="" className="h-4.5 w-auto opacity-75" />
          {onOpenNav ? (
            <button
              data-testid="story-nav-toggle"
              type="button"
              onClick={onOpenNav}
              aria-label={t('chatWindow.navAria')}
              className="rounded-lg p-3 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-stone-900"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {contextUsage ? (
            <ContextGauge
              pendingWords={contextUsage.pendingWords}
              thresholdWords={contextUsage.autoSummaryThresholdWords}
            />
          ) : null}
          <button
            data-testid="history-toggle"
            type="button"
            aria-label={t('chatWindow.historyAria')}
            title={t('chatWindow.historyAria')}
            aria-pressed={isHistoryOpen}
            className={`rounded-lg p-3 hover:bg-stone-100 dark:hover:bg-stone-900 ${
              isHistoryOpen
                ? 'text-stone-600 dark:text-stone-300'
                : 'text-stone-400 dark:text-stone-500'
            }`}
            onClick={() => setIsHistoryOpen((open) => !open)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 9a8.5 8.5 0 1 1-.9 5.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 4.5v4.5H7" />
            </svg>
          </button>
          <LogoutButton />
        </div>
      </div>
      {summarizeError ? (
        <div className="flex w-full shrink-0 items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-5 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
          <p data-testid="summarize-error">
            {t('chatWindow.summarizeErrorPrefix', { message: summarizeError })}
          </p>
          <button
            type="button"
            aria-label={t('chatWindow.closeAria')}
            className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
            onClick={() => setSummarizeError(null)}
          >
            ✕
          </button>
        </div>
      ) : null}
      <ConfirmDialog
        open={isResetConfirmOpen}
        title={t('chatWindow.resetTitle')}
        confirmLabel={t('chatWindow.resetConfirm')}
        onConfirm={handleReset}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
      <div className="relative flex min-h-0 flex-1">
        <ConfigPanel
          open={isConfigPanelOpen}
          onClose={() => setIsConfigPanelOpen(false)}
          sections={CONFIG_PANEL_SECTIONS}
        />
        {isHistoryOpen ? (
          <HistoryView
            key={historyResetSignal}
            storyId={storyId}
            onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
            onSummarize={handleSummarize}
            isSummarizeDisabled={
              storyPassages.length === 0 || isAiTyping || isSummarizing || summarizedPassage !== null
            }
            onEditHistoryPrompt={handleEditHistoryPrompt}
          />
        ) : (
          <>
            <StoryView
              passages={storyPassages}
              isGenerating={isWaitingForNextPassage}
              isSummarizing={isSummarizing}
              displayOverride={manuscriptDisplayOverride}
              pendingPrompt={pendingPrompt}
              generationDraft={generationDraft}
              currentPrompt={lastUserPromptForEdit}
              canEditPrompt={
                lastUserPromptForEdit !== null &&
                !isAiTyping &&
                !isSummarizing &&
                !isEditPromptMode &&
                manuscriptDisplayOverride === null
              }
              onStartEditPrompt={handleStartEditPrompt}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-6">
              <div className="pointer-events-auto w-full max-w-xl">
                {/* While a generation or a manual summary is streaming, the
                    floating input is replaced outright by the activity
                    indicator (+ stop button, when the action can be
                    cancelled — issue #39, extended to summarize by #54) —
                    see FloatingActivityBar. The chat drawer's own
                    MessageInput (not this one) keeps its prior
                    isGenerating/onStop swap-the-button behavior. An
                    edit-prompt-triggered generation (issue #63) goes
                    through the exact same isAiTyping path as a normal send,
                    so no separate branch is needed for it. */}
                {isAiTyping ? (
                  <FloatingActivityBar
                    label={isWaitingForFirstChunk ? t('chatWindow.thinking') : t('chatWindow.writing')}
                    onStop={handleStop}
                    labelTestId="continue-activity-indicator"
                    stopTestId="continue-stop-button"
                  />
                ) : isSummarizing ? (
                  <FloatingActivityBar
                    label={t('chatWindow.summarizing')}
                    labelTestId="continue-activity-indicator"
                    stopTestId="continue-stop-button"
                  />
                ) : (
                  <MessageInput
                    key={isEditPromptMode ? 'edit' : 'continue'}
                    onSend={isEditPromptMode ? handleEditPrompt : handleSend}
                    disabled={false}
                    variant="floating"
                    placeholder=""
                    autoFocus
                    inputTestId="continue-input"
                    sendTestId="continue-send-button"
                    stopTestId="continue-stop-button"
                    initialValue={isEditPromptMode ? (lastUserPromptForEdit ?? '') : ''}
                    submitLabel={isEditPromptMode ? t('common.save') : t('chatWindow.send')}
                    onCancel={isEditPromptMode ? handleCancelEditPrompt : undefined}
                    cancelTestId="continue-cancel-edit-button"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
