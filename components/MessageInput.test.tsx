import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput } from './MessageInput'

describe('MessageInput', () => {
  it('calls onSend with the trimmed content when the button is clicked', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={false} />)

    await user.type(screen.getByTestId('message-input'), '  Bonjour  ')
    await user.click(screen.getByTestId('send-button'))

    expect(onSend).toHaveBeenCalledWith('Bonjour')
  })

  it('calls onSend when Enter is pressed', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={false} />)

    await user.type(screen.getByTestId('message-input'), 'Bonjour{Enter}')

    expect(onSend).toHaveBeenCalledWith('Bonjour')
  })

  it('does not call onSend for an empty or whitespace-only message', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={false} />)

    await user.type(screen.getByTestId('message-input'), '   ')
    await user.click(screen.getByTestId('send-button'))

    expect(onSend).not.toHaveBeenCalled()
  })

  it('clears the input after sending', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={false} />)

    const input = screen.getByTestId('message-input') as HTMLTextAreaElement
    await user.type(input, 'Bonjour{Enter}')

    expect(input.value).toBe('')
  })

  it('disables the input and button when disabled is true', () => {
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} disabled={true} />)

    expect(screen.getByTestId('message-input')).toBeDisabled()
    expect(screen.getByTestId('send-button')).toBeDisabled()
  })

  it('shows a Stop button instead of the send button while generating', () => {
    const onSend = vi.fn()
    const onStop = vi.fn()
    render(<MessageInput onSend={onSend} disabled={true} isGenerating={true} onStop={onStop} />)

    expect(screen.queryByTestId('send-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('stop-button')).toBeInTheDocument()
    expect(screen.getByTestId('stop-button')).not.toBeDisabled()
  })

  it('calls onStop when the Stop button is clicked', async () => {
    const onSend = vi.fn()
    const onStop = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={true} isGenerating={true} onStop={onStop} />)

    await user.click(screen.getByTestId('stop-button'))

    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('uses custom test ids and placeholder when provided', () => {
    const onSend = vi.fn()
    render(
      <MessageInput
        onSend={onSend}
        disabled={false}
        variant="floating"
        placeholder="Continue…"
        inputTestId="continue-input"
        sendTestId="continue-send-button"
      />,
    )

    expect(screen.queryByTestId('message-input')).not.toBeInTheDocument()
    expect(screen.getByTestId('continue-input')).toHaveAttribute('placeholder', 'Continue…')
    expect(screen.getByTestId('continue-send-button')).toBeInTheDocument()
  })

  it('seeds the textarea from initialValue', () => {
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} disabled={false} initialValue="en une phrase" />)

    expect(screen.getByTestId('message-input')).toHaveValue('en une phrase')
  })

  it('uses a custom submit label when provided', () => {
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} disabled={false} submitLabel="Réécrire" />)

    expect(screen.getByTestId('send-button')).toHaveTextContent('Réécrire')
  })

  it('does not call onSend for a blank message by default', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={false} />)

    await user.click(screen.getByTestId('send-button'))

    expect(onSend).not.toHaveBeenCalled()
  })

  it('calls onSend with an empty string when allowEmptySubmit is set and the field is left blank', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={false} allowEmptySubmit />)

    await user.click(screen.getByTestId('send-button'))

    expect(onSend).toHaveBeenCalledWith('')
  })

  it('does not show a cancel button when onCancel is not provided', () => {
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} disabled={false} />)

    expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
  })

  it('shows a cancel button that calls onCancel when provided', async () => {
    const onSend = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={false} onCancel={onCancel} />)

    await user.click(screen.getByTestId('cancel-button'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('hides the cancel button while generating, same as the send button', () => {
    const onSend = vi.fn()
    const onCancel = vi.fn()
    const onStop = vi.fn()
    render(
      <MessageInput onSend={onSend} disabled={true} isGenerating onStop={onStop} onCancel={onCancel} />,
    )

    expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
  })
})
