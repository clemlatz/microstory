import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryNavDrawer } from './StoryNavDrawer'
import { recordRecentEntity } from '@/lib/recentEntities'

describe('StoryNavDrawer', () => {
  it('renders nothing when closed', () => {
    render(
      <StoryNavDrawer
        open={false}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('story-nav-drawer')).not.toBeInTheDocument()
  })

  it('lists every section', () => {
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    expect(screen.getByTestId('story-nav-search')).toBeInTheDocument()
    expect(screen.getByTestId('story-nav-overview')).toBeInTheDocument()
    expect(screen.getByTestId('story-nav-characters')).toBeInTheDocument()
    expect(screen.getByTestId('story-nav-notes')).toBeInTheDocument()
    expect(screen.getByTestId('story-nav-documentation')).toBeInTheDocument()
  })

  it('shows the search item as the first entry', () => {
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    const items = screen.getAllByRole('button').filter((el) => el.dataset.testid?.startsWith('story-nav-'))
    expect(items[0]).toHaveAttribute('data-testid', 'story-nav-search')
  })

  it('highlights the active section', () => {
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="notes"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
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
      />,
    )

    await user.click(screen.getByTestId('story-nav-my-stories'))

    expect(onBackToStories).toHaveBeenCalledTimes(1)
  })

  it('shows the language switcher at the bottom', () => {
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument()
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
      />,
    )

    await user.click(screen.getByTestId('story-nav-backdrop'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('lists recently viewed entities below the sections, most recent first, linking to their pages', () => {
    window.localStorage.clear()
    recordRecentEntity('s1', { kind: 'note', id: 'n1', title: 'Old note' })
    recordRecentEntity('s1', { kind: 'character', id: 'c1', title: 'Alice' })
    render(
      <StoryNavDrawer
        open={true}
        storyId="s1"
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    const links = screen.getAllByTestId('story-nav-recent-item')
    expect(links.map((l) => l.textContent)).toEqual(['Alice', 'Old note'])
    expect(links[0]).toHaveAttribute('href', '/story/s1/character/c1')
    expect(links[1]).toHaveAttribute('href', '/story/s1/note/n1')
  })

  it('shows no recent section when nothing was viewed', () => {
    window.localStorage.clear()
    render(
      <StoryNavDrawer
        open={true}
        storyId="empty"
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('story-nav-recent')).not.toBeInTheDocument()
  })
})
