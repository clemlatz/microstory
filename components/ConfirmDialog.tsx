'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from '@/lib/i18n/LocaleContext'

type ConfirmDialogProps = {
  open: boolean
  title: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLocale()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  // Callers pass inline handlers; a ref keeps the effect below from re-running
  // (and re-stealing focus) on every render.
  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  })

  // Modal keyboard behaviour: focus the safe (cancel) action on open, close on
  // Escape, keep Tab inside the dialog, and hand focus back to whatever
  // opened it once it closes (WCAG 2.1.2, 2.4.3).
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancelRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      opener?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      data-testid="confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="confirm-dialog"
        className="w-full max-w-sm rounded-lg border border-[var(--reader-rule)] bg-[var(--reader-bg)] p-5 font-reader-label shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm text-[var(--reader-ink)]">{title}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            data-testid="confirm-dialog-cancel"
            type="button"
            className="min-h-11 rounded-md px-3.5 py-1.5 text-sm text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)]"
            onClick={onCancel}
          >
            {cancelLabel ?? t('confirmDialog.cancel')}
          </button>
          <button
            data-testid="confirm-dialog-confirm"
            type="button"
            className="min-h-11 rounded-md bg-[var(--reader-danger)] px-3.5 py-1.5 text-sm font-medium text-[var(--reader-accent-ink)] hover:opacity-90"
            onClick={onConfirm}
          >
            {confirmLabel ?? t('confirmDialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
