import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigPanel } from './ConfigPanel'

describe('ConfigPanel', () => {
  it('renders nothing when closed', () => {
    render(<ConfigPanel open={false} onClose={vi.fn()} sections={[{ id: 'a', label: 'A', content: <p>A content</p> }]} />)
    expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument()
  })

  it('renders the active section content when open', () => {
    render(<ConfigPanel open onClose={vi.fn()} sections={[{ id: 'a', label: 'A', content: <p>A content</p> }]} />)
    expect(screen.getByTestId('config-panel')).toBeInTheDocument()
    expect(screen.getByText('A content')).toBeInTheDocument()
  })

  it('does not show tabs when there is a single section', () => {
    render(<ConfigPanel open onClose={vi.fn()} sections={[{ id: 'a', label: 'A', content: <p>A content</p> }]} />)
    expect(screen.queryByTestId('config-panel-tab-a')).not.toBeInTheDocument()
  })

  it('shows tabs and switches between sections when there are several', async () => {
    const user = userEvent.setup()
    render(
      <ConfigPanel
        open
        onClose={vi.fn()}
        sections={[
          { id: 'a', label: 'A', content: <p>A content</p> },
          { id: 'b', label: 'B', content: <p>B content</p> },
        ]}
      />,
    )

    expect(screen.getByText('A content')).toBeInTheDocument()
    expect(screen.queryByText('B content')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('config-panel-tab-b'))

    expect(screen.getByText('B content')).toBeInTheDocument()
    expect(screen.queryByText('A content')).not.toBeInTheDocument()
  })

  it('calls onClose when clicking the close button', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<ConfigPanel open onClose={onClose} sections={[{ id: 'a', label: 'A', content: <p>A</p> }]} />)

    await user.click(screen.getByTestId('config-panel-close'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking the backdrop', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<ConfigPanel open onClose={onClose} sections={[{ id: 'a', label: 'A', content: <p>A</p> }]} />)

    await user.click(screen.getByTestId('config-panel-backdrop'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
