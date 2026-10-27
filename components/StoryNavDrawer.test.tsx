import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryNavDrawer } from './StoryNavDrawer'
import { recordRecentEntity } from '@/lib/recentEntities'
import { createCharacter, fetchCharacters } from '@/lib/charactersApi'
import type { Character } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: vi.fn() }),
}))

vi.mock('@/lib/charactersApi', () => ({
  fetchCharacters: vi.fn(),
  createCharacter: vi.fn(),
}))
vi.mock('@/lib/notesApi', () => ({
  fetchNotes: vi.fn().mockResolvedValue([]),
  createNote: vi.fn(),
}))
vi.mock('@/lib/documentationApi', () => ({
  fetchDocumentation: vi.fn().mockResolvedValue([]),
  createDocumentationEntry: vi.fn(),
}))

const mockedFetchCharacters = vi.mocked(fetchCharacters)
const mockedCreateCharacter = vi.mocked(createCharacter)

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
    expect(screen.getByTestId('story-nav-drawer')).toHaveAttribute('inert')
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
    const items = screen.getAllByRole('link').filter((el) => el.dataset.testid?.startsWith('story-nav-'))
    expect(items[0]).toHaveAttribute('data-testid', 'story-nav-search')
  })

  it('highlights the active section', () => {
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="search"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    expect(screen.getByTestId('story-nav-search')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('story-nav-overview')).not.toHaveAttribute('aria-current')
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

    await user.click(screen.getByTestId('story-nav-search'))

    expect(onNavigate).toHaveBeenCalledWith('search')
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

  it('highlights the displayed entry in the recent list instead of its section', () => {
    window.localStorage.clear()
    recordRecentEntity('s1', { kind: 'note', id: 'n1', title: 'Old note' })
    recordRecentEntity('s1', { kind: 'character', id: 'c1', title: 'Alice' })
    render(
      <StoryNavDrawer
        open={true}
        storyId="s1"
        onClose={vi.fn()}
        activeSection="characters"
        activeEntry={{ kind: 'character', id: 'c1' }}
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    const [alice, oldNote] = screen.getAllByTestId('story-nav-recent-item')
    expect(alice).toHaveAttribute('aria-current', 'page')
    expect(oldNote).not.toHaveAttribute('aria-current')
    expect(screen.getByTestId('story-nav-characters')).toHaveAttribute('aria-expanded', 'true')
  })

  it('calls onNavigateToEntry when a recent entry is selected', async () => {
    window.localStorage.clear()
    recordRecentEntity('s1', { kind: 'note', id: 'n1', title: 'A note' })
    const onNavigateToEntry = vi.fn()
    render(
      <StoryNavDrawer
        open={true}
        storyId="s1"
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onNavigateToEntry={onNavigateToEntry}
        onBackToStories={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByTestId('story-nav-recent-item'))
    expect(onNavigateToEntry).toHaveBeenCalledTimes(1)
  })

  it('highlights the section when no entry is displayed', () => {
    window.localStorage.clear()
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
    expect(screen.getByTestId('story-nav-overview')).toHaveAttribute('aria-current', 'page')
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

  describe('mobile overlay keyboard behaviour', () => {
    function renderOpen(onClose = vi.fn()) {
      render(
        <StoryNavDrawer
          open={true}
          storyId="s1"
          onClose={onClose}
          activeSection="overview"
          onNavigate={vi.fn()}
          onBackToStories={vi.fn()}
        />,
      )
      return onClose
    }

    it('focuses the first item when opened', () => {
      renderOpen()
      expect(screen.getByTestId('story-nav-search')).toHaveFocus()
    })

    it('closes on Escape', async () => {
      const onClose = renderOpen()
      await userEvent.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('wraps Tab from the last control back to the first', async () => {
      renderOpen()
      screen.getByTestId('language-switcher').focus()
      await userEvent.tab()
      expect(screen.getByTestId('story-nav-search')).toHaveFocus()
    })
  })

  it('shows a backup download link pointing at the story export route', () => {
    render(
      <StoryNavDrawer
        open={true}
        storyId="story-1"
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    expect(screen.getByTestId('story-export-link')).toHaveAttribute('href', '/api/stories/story-1/export')
  })

  it('does not show a backup download link without a storyId', () => {
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('story-export-link')).not.toBeInTheDocument()
  })

  it('shows a labelled logout button', () => {
    render(
      <StoryNavDrawer
        open={true}
        onClose={vi.fn()}
        activeSection="overview"
        onNavigate={vi.fn()}
        onBackToStories={vi.fn()}
      />,
    )
    expect(screen.getByTestId('logout-button')).toHaveTextContent('Log out')
  })

  describe('foldable entry sections', () => {
    const character = (id: string, name: string) => ({ id, name }) as Character

    function renderDrawer(props: Partial<React.ComponentProps<typeof StoryNavDrawer>> = {}) {
      window.localStorage.clear()
      mockRouterPush.mockClear()
      mockedFetchCharacters.mockResolvedValue([character('c2', 'Zed'), character('c1', 'Alice')])
      return render(
        <StoryNavDrawer
          open={true}
          storyId="s1"
          onClose={vi.fn()}
          activeSection="overview"
          onNavigate={vi.fn()}
          onBackToStories={vi.fn()}
          {...props}
        />,
      )
    }

    it("unfolds the section's entries, sorted, instead of navigating", async () => {
      const onNavigate = vi.fn()
      renderDrawer({ onNavigate })
      const section = screen.getByTestId('story-nav-characters')
      expect(section).toHaveAttribute('aria-expanded', 'false')

      await userEvent.click(section)

      expect(section).toHaveAttribute('aria-expanded', 'true')
      const entries = await screen.findAllByTestId('story-nav-entry')
      expect(entries.map((e) => e.textContent)).toEqual(['Alice', 'Zed'])
      expect(entries[0]).toHaveAttribute('href', '/story/s1/character/c1')
      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('folds the section again on a second click', async () => {
      renderDrawer()
      const section = screen.getByTestId('story-nav-characters')
      await userEvent.click(section)
      await userEvent.click(section)
      expect(section).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByTestId('story-nav-entry')).not.toBeInTheDocument()
    })

    it('unfolds the section of the displayed entry and highlights it, with its live title', async () => {
      renderDrawer({ activeEntry: { kind: 'character', id: 'c1' }, activeEntryTitle: 'Alice renamed' })

      const entries = await screen.findAllByTestId('story-nav-entry')
      expect(entries[0]).toHaveTextContent('Alice renamed')
      expect(entries[0]).toHaveAttribute('aria-current', 'page')
      expect(entries[1]).not.toHaveAttribute('aria-current')
    })

    it('calls onNavigateToEntry when an entry is selected', async () => {
      const onNavigateToEntry = vi.fn()
      renderDrawer({ onNavigateToEntry })
      await userEvent.click(screen.getByTestId('story-nav-characters'))
      await userEvent.click((await screen.findAllByTestId('story-nav-entry'))[0])
      expect(onNavigateToEntry).toHaveBeenCalledTimes(1)
    })

    it('creates a new entry from the last row and opens its page', async () => {
      renderDrawer()
      mockedCreateCharacter.mockResolvedValue({ id: 'c9', name: 'Untitled character' } as Character)
      await userEvent.click(screen.getByTestId('story-nav-characters'))

      await userEvent.click(await screen.findByTestId('story-nav-new-entry'))

      expect(mockedCreateCharacter).toHaveBeenCalledWith('s1', { name: 'Untitled character', description: '' })
      await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/story/s1/character/c9'))
    })

    it('remembers which sections are unfolded across remounts', async () => {
      const { unmount } = renderDrawer()
      await userEvent.click(screen.getByTestId('story-nav-characters'))
      unmount()

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
      expect(screen.getByTestId('story-nav-characters')).toHaveAttribute('aria-expanded', 'true')
    })
  })
})
