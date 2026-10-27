import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function setup() {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<ConfirmDialog open title="Delete?" onConfirm={onConfirm} onCancel={onCancel} />)
  return { onConfirm, onCancel }
}

describe('ConfirmDialog keyboard behaviour', () => {
  it('focuses the cancel button when opened', () => {
    setup()
    expect(screen.getByTestId('confirm-dialog-cancel')).toHaveFocus()
  })

  it('cancels on Escape', async () => {
    const { onCancel } = setup()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps Tab focus inside the dialog', async () => {
    setup()
    await userEvent.tab()
    expect(screen.getByTestId('confirm-dialog-confirm')).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByTestId('confirm-dialog-cancel')).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByTestId('confirm-dialog-confirm')).toHaveFocus()
  })
})
