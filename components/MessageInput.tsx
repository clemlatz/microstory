'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLocale } from '@/lib/i18n/LocaleContext'

type MessageInputProps = {
  onSend: (content: string) => void
  disabled: boolean
  isGenerating?: boolean
  onStop?: () => void
  variant?: 'default' | 'floating'
  placeholder?: string
  inputTestId?: string
  sendTestId?: string
  stopTestId?: string
  autoFocus?: boolean
  /** Seeds the textarea's value on mount — see the `key`-remount note below. */
  initialValue?: string
  /** Label for the submit button; defaults to "Envoyer" (e.g. "Réécrire" for rewrite mode — see ChatWindow). */
  submitLabel?: string
  /** Lets `submit()` fire with an empty/whitespace-only value (rewrite mode: a blank instruction asks for a generic rewrite). */
  allowEmptySubmit?: boolean
  /** When set, renders a cancel button next to submit (rewrite mode's "back to Continuer" escape hatch, see ChatWindow). */
  onCancel?: () => void
  cancelTestId?: string
}

const MAX_VISIBLE_ROWS = 6

/**
 * `initialValue` only seeds `value` at mount time — it is not synced via an
 * effect. Callers that need to reset/reseed the field when switching modes
 * (see ChatWindow's "Continuer" ⇄ "Réécrire" toggle on the floating instance)
 * should change the element's `key` so React remounts a fresh instance
 * rather than trying to make this component react to `initialValue` changing
 * underneath an in-progress edit.
 */
export function MessageInput({
  onSend,
  disabled,
  isGenerating = false,
  onStop,
  variant = 'default',
  placeholder,
  inputTestId = 'message-input',
  sendTestId = 'send-button',
  stopTestId = 'stop-button',
  autoFocus = false,
  initialValue = '',
  submitLabel,
  allowEmptySubmit = false,
  onCancel,
  cancelTestId = 'cancel-button',
}: MessageInputProps) {
  const { t } = useLocale()
  const [value, setValue] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height first so shrinking (e.g. after clearing) is measured correctly.
    textarea.style.height = 'auto'

    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight)
    const maxHeight = (Number.isFinite(lineHeight) ? lineHeight : 20) * MAX_VISIBLE_ROWS
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight)

    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [value])

  function submit() {
    const trimmed = value.trim()
    if (!trimmed && !allowEmptySubmit) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  const isFloating = variant === 'floating'

  return (
    <div
      className={
        isFloating
          ? 'flex items-center gap-2 rounded-2xl border border-[#e7e1d5] bg-[#fffdf8]/95 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95'
          : 'flex shrink-0 gap-2 border-t border-gray-200 p-4 dark:border-gray-800'
      }
    >
      <textarea
        ref={textareaRef}
        data-testid={inputTestId}
        className={
          isFloating
            ? 'flex-1 resize-none bg-transparent px-2 py-1.5 text-stone-900 placeholder:text-stone-400 focus:outline-none disabled:opacity-50 dark:text-stone-100 dark:placeholder:text-stone-500'
            : 'flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500'
        }
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t('messageInput.placeholder')}
        autoFocus={autoFocus}
      />
      {isGenerating ? (
        <button
          data-testid={stopTestId}
          type="button"
          className={
            isFloating
              ? 'shrink-0 rounded-xl bg-stone-700 px-4 py-2 text-white dark:bg-stone-600'
              : 'rounded-lg bg-gray-700 px-4 py-2 text-white dark:bg-gray-600'
          }
          onClick={onStop}
        >
          {t('messageInput.stop')}
        </button>
      ) : (
        <>
          {onCancel ? (
            <button
              data-testid={cancelTestId}
              type="button"
              className={
                isFloating
                  ? 'shrink-0 rounded-xl border border-[#e7e1d5] px-3 py-2 text-stone-500 hover:bg-[#f6f1e7] dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800'
                  : 'shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
              }
              onClick={onCancel}
            >
              {t('messageInput.cancel')}
            </button>
          ) : null}
          <button
            data-testid={sendTestId}
            type="button"
            className={
              isFloating
                ? 'shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500'
                : 'rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500'
            }
            disabled={disabled}
            onClick={submit}
          >
            {submitLabel ?? t('messageInput.send')}
          </button>
        </>
      )}
    </div>
  )
}
