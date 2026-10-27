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

  it('renders the title as an editable input when onTitleChange is provided', async () => {
    const user = userEvent.setup()
    const onTitleChange = vi.fn()
    render(<StoryTitleBar title="Adaline Marrow" onOpenNav={vi.fn()} onTitleChange={onTitleChange} />)

    const input = screen.getByTestId('story-title')
    expect(input).toHaveValue('Adaline Marrow')

    await user.type(input, '!')

    expect(onTitleChange).toHaveBeenCalledWith('Adaline Marrow!')
  })

  it('does not show a save-status icon when saveStatus is not provided', () => {
    render(<StoryTitleBar title="Le Voyage de Nour" onOpenNav={vi.fn()} />)
    expect(screen.queryByTestId('story-save-status')).not.toBeInTheDocument()
  })

  it('shows an accessible "unsaved" status when saveStatus is "unsaved"', () => {
    render(<StoryTitleBar title="Adaline Marrow" onOpenNav={vi.fn()} saveStatus="unsaved" />)
    expect(screen.getByTestId('story-save-status')).toHaveAccessibleName('Unsaved changes')
  })

  it('shows an accessible "saving" status when saveStatus is "saving"', () => {
    render(<StoryTitleBar title="Adaline Marrow" onOpenNav={vi.fn()} saveStatus="saving" />)
    expect(screen.getByTestId('story-save-status')).toHaveAccessibleName('Saving…')
  })

  it('shows an accessible "saved" status when saveStatus is "saved"', () => {
    render(<StoryTitleBar title="Adaline Marrow" onOpenNav={vi.fn()} saveStatus="saved" />)
    expect(screen.getByTestId('story-save-status')).toHaveAccessibleName('Saved')
  })

  describe('title color', () => {
    const pendingClass = 'text-[var(--reader-pending)]'
    function renderEditable(saveStatus?: 'unsaved' | 'saving' | 'saved') {
      render(
        <StoryTitleBar title="Adaline Marrow" onOpenNav={vi.fn()} onTitleChange={vi.fn()} saveStatus={saveStatus} />,
      )
      return screen.getByTestId('story-title')
    }

    it('is orange while changes are unsaved', () => {
      expect(renderEditable('unsaved').className).toContain(pendingClass)
    })

    it('stays orange while saving', () => {
      expect(renderEditable('saving').className).toContain(pendingClass)
    })

    it('goes back to the normal color once saved', () => {
      expect(renderEditable('saved').className).not.toContain(pendingClass)
    })

    it('uses the normal color when there is no save status', () => {
      expect(renderEditable().className).not.toContain(pendingClass)
    })
  })

  describe('delete button', () => {
    it('is not shown without onDelete', () => {
      render(<StoryTitleBar title="Adaline Marrow" onOpenNav={vi.fn()} />)
      expect(screen.queryByTestId('story-delete-button')).not.toBeInTheDocument()
    })

    it('calls onDelete when clicked', async () => {
      const onDelete = vi.fn()
      render(<StoryTitleBar title="Adaline Marrow" onOpenNav={vi.fn()} onDelete={onDelete} />)
      await userEvent.click(screen.getByTestId('story-delete-button'))
      expect(onDelete).toHaveBeenCalledTimes(1)
    })
  })
})
