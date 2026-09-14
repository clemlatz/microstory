import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryTitleBar } from './StoryTitleBar'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe('StoryTitleBar', () => {
  it('shows the story title', () => {
    render(<StoryTitleBar title="Le Voyage de Nour" onOpenNav={vi.fn()} />)
    expect(screen.getByTestId('story-title')).toHaveTextContent('Le Voyage de Nour')
  })

  it('calls onOpenNav when the toggle button is clicked', async () => {
    const user = userEvent.setup()
    const onOpenNav = vi.fn()
    render(<StoryTitleBar title="Le Voyage de Nour" onOpenNav={onOpenNav} />)

    await user.click(screen.getByTestId('story-nav-toggle'))

    expect(onOpenNav).toHaveBeenCalledTimes(1)
  })

  it('shows the logout button', () => {
    render(<StoryTitleBar title="Le Voyage de Nour" onOpenNav={vi.fn()} />)
    expect(screen.getByTestId('logout-button')).toBeInTheDocument()
  })

  it('renders the title as an editable input when onTitleChange is provided', async () => {
    const user = userEvent.setup()
    const onTitleChange = vi.fn()
    render(<StoryTitleBar title="Adaline Marrow" onOpenNav={vi.fn()} onTitleChange={onTitleChange} />)

    const input = screen.getByTestId('story-title')
    expect(input).toHaveValue('Adaline Marrow')

    await user.type(input, '!')

    expect(onTitleChange).toHaveBeenCalledWith('Adaline Marrow!')
  })

  it('does not show a save-status icon when isSaving is not provided', () => {
    render(<StoryTitleBar title="Le Voyage de Nour" onOpenNav={vi.fn()} />)
    expect(screen.queryByTestId('story-save-status')).not.toBeInTheDocument()
  })

  it('shows an accessible "saving" status when isSaving is true', () => {
    render(<StoryTitleBar title="Adaline Marrow" onOpenNav={vi.fn()} isSaving={true} />)
    expect(screen.getByTestId('story-save-status')).toHaveAccessibleName('Saving…')
  })

  it('shows an accessible "saved" status when isSaving is false', () => {
    render(<StoryTitleBar title="Adaline Marrow" onOpenNav={vi.fn()} isSaving={false} />)
    expect(screen.getByTestId('story-save-status')).toHaveAccessibleName('Saved')
  })
})
