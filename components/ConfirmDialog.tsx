'use client'

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
  if (!open) return null

  return (
    <div
      data-testid="confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
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
