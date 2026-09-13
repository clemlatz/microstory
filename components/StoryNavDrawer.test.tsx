import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryNavDrawer } from './StoryNavDrawer'

describe('StoryNavDrawer', () => {
  it('renders nothing when closed', () => {
    render(
      <StoryNavDrawer
        open={false}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
        llmWritingEnabled={true}
      />,
    )
    expect(screen.queryByTestId('story-nav-drawer')).not.toBeInTheDocument()
  })

  it('lists every section, including the manuscript, when llmWritingEnabled is true', () => {
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
        llmWritingEnabled={true}
      />,
    )
    expect(screen.getByTestId('story-nav-overview')).toBeInTheDocument()
    expect(screen.getByTestId('story-nav-characters')).toBeInTheDocument()
    expect(screen.getByTestId('story-nav-notes')).toBeInTheDocument()
    expect(screen.getByTestId('story-nav-documentation')).toBeInTheDocument()
    expect(screen.getByTestId('story-nav-manuscript')).toBeInTheDocument()
  })

  it('hides the manuscript item when llmWritingEnabled is false', () => {
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
        llmWritingEnabled={false}
      />,
    )
    expect(screen.queryByTestId('story-nav-manuscript')).not.toBeInTheDocument()
  })

  it('highlights the active section', () => {
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="notes"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
        llmWritingEnabled={true}
      />,
    )
    expect(screen.getByTestId('story-nav-notes')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('story-nav-characters')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onNavigate with the clicked section', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={onNavigate}
        onBackToStories={vi.fn()}
        llmWritingEnabled={true}
      />,
    )

    await user.click(screen.getByTestId('story-nav-documentation'))

    expect(onNavigate).toHaveBeenCalledWith('documentation')
  })

  it('calls onBackToStories when the "My stories" item is clicked', async () => {
    const user = userEvent.setup()
    const onBackToStories = vi.fn()
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={onBackToStories}
        llmWritingEnabled={true}
      />,
    )

    await user.click(screen.getByTestId('story-nav-my-stories'))

    expect(onBackToStories).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <StoryNavDrawer
        open={true}
        onClose={onClose}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
        llmWritingEnabled={true}
      />,
    )

    await user.click(screen.getByTestId('story-nav-close'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <StoryNavDrawer
        open={true}
        onClose={onClose}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
        llmWritingEnabled={true}
      />,
    )

    await user.click(screen.getByTestId('story-nav-backdrop'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
