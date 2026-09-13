import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryPageClient } from './StoryPageClient'
import type { Story } from '@/lib/types'

const mockRouterPush = vi.fn()
let mockSearchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/lib/charactersApi', () => ({
  fetchCharacters: vi.fn().mockResolvedValue([]),
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
}))

vi.mock('@/lib/notesApi', () => ({
  fetchNotes: vi.fn().mockResolvedValue([]),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}))

vi.mock('@/lib/documentationApi', () => ({
  fetchDocumentation: vi.fn().mockResolvedValue([]),
  createDocumentationEntry: vi.fn(),
  deleteDocumentationEntry: vi.fn(),
}))

vi.mock('@/lib/aiResponse', () => ({
  fetchAiResponse: vi.fn(),
  fetchMessages: vi.fn().mockResolvedValue([]),
  resetConversation: vi.fn(),
  resumeAiResponse: vi.fn().mockResolvedValue({ resumed: false }),
  stopGeneration: vi.fn(),
}))

vi.mock('@/lib/writerPromptApi', () => ({
  fetchWriterPrompt: vi.fn().mockResolvedValue(''),
  updateWriterPrompt: vi.fn(),
}))

vi.mock('@/lib/contextUsageApi', () => ({
  fetchContextUsage: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/summarizeApi', () => ({
  fetchSummary: vi.fn(),
}))

vi.mock('@/lib/conversationSummaryApi', () => ({
  persistConversationSummary: vi.fn(),
  fetchActiveConversationSummary: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/historyApi', () => ({
  fetchHistory: vi.fn(),
}))

const story: Story = {
  id: 'story-1',
  title: 'Le Voyage de Nour',
  presentation: '',
  createdAt: 1000,
  updatedAt: 2000,
  lastPassagePreview: null,
}

describe('StoryPageClient', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockSearchParams = new URLSearchParams()
  })

  it('shows the story overview by default', async () => {
    render(<StoryPageClient story={story} llmWritingEnabled={true} />)
    expect(screen.getByTestId('story-title')).toHaveTextContent('Le Voyage de Nour')
  })

  it('seeds the initial section from the ?section= query param', async () => {
    mockSearchParams = new URLSearchParams('section=notes')
    render(<StoryPageClient story={story} llmWritingEnabled={true} />)

    await waitFor(() => expect(screen.getByText(/No notes/)).toBeInTheDocument())
  })

  it('falls back to the overview for an unrecognized ?section= value', async () => {
    mockSearchParams = new URLSearchParams('section=bogus')
    render(<StoryPageClient story={story} llmWritingEnabled={true} />)

    expect(screen.getByTestId('story-presentation-preview')).toBeInTheDocument()
  })

  it('falls back to the overview when ?section=manuscript is disabled', async () => {
    mockSearchParams = new URLSearchParams('section=manuscript')
    render(<StoryPageClient story={story} llmWritingEnabled={false} />)

    expect(screen.getByTestId('story-presentation-preview')).toBeInTheDocument()
  })

  it('switches to the manuscript and back via the navigation drawer', async () => {
    const user = userEvent.setup()
    render(<StoryPageClient story={story} llmWritingEnabled={true} />)

    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-manuscript'))
    await waitFor(() => expect(screen.getByTestId('story-nav-toggle')).toBeInTheDocument())
    expect(screen.queryByTestId('story-title')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-overview'))
    expect(screen.getByTestId('story-title')).toBeInTheDocument()
  })

  it('highlights the manuscript item as active once on the manuscript', async () => {
    const user = userEvent.setup()
    render(<StoryPageClient story={story} llmWritingEnabled={true} />)

    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-manuscript'))
    await user.click(screen.getByTestId('story-nav-toggle'))

    expect(screen.getByTestId('story-nav-manuscript')).toHaveAttribute('aria-pressed', 'true')
  })

  it('hides the "Manuscrit" item and never reaches the manuscript when disabled', async () => {
    const user = userEvent.setup()
    render(<StoryPageClient story={story} llmWritingEnabled={false} />)

    expect(screen.getByTestId('story-title')).toBeInTheDocument()
    await user.click(screen.getByTestId('story-nav-toggle'))
    expect(screen.queryByTestId('story-nav-manuscript')).not.toBeInTheDocument()
  })

  it('navigates between the knowledge-base sections', async () => {
    const user = userEvent.setup()
    render(<StoryPageClient story={story} llmWritingEnabled={true} />)

    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-notes'))

    await waitFor(() => expect(screen.getByText(/No notes/)).toBeInTheDocument())
  })

  describe('on a desktop-width viewport', () => {
    const originalMatchMedia = window.matchMedia

    beforeEach(() => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    })

    afterEach(() => {
      window.matchMedia = originalMatchMedia
    })

    it('shows the sidebar open by default', async () => {
      render(<StoryPageClient story={story} llmWritingEnabled={true} />)

      await waitFor(() => expect(screen.getByTestId('story-nav-drawer')).toBeInTheDocument())
    })

    it('keeps the sidebar open after navigating to a different section', async () => {
      const user = userEvent.setup()
      render(<StoryPageClient story={story} llmWritingEnabled={true} />)
      await waitFor(() => expect(screen.getByTestId('story-nav-drawer')).toBeInTheDocument())

      await user.click(screen.getByTestId('story-nav-notes'))

      await waitFor(() => expect(screen.getByText(/No notes/)).toBeInTheDocument())
      expect(screen.getByTestId('story-nav-drawer')).toBeInTheDocument()
    })

    it('hides the sidebar when the toggle button is clicked again', async () => {
      const user = userEvent.setup()
      render(<StoryPageClient story={story} llmWritingEnabled={true} />)
      await waitFor(() => expect(screen.getByTestId('story-nav-drawer')).toBeInTheDocument())

      await user.click(screen.getByTestId('story-nav-toggle'))

      expect(screen.queryByTestId('story-nav-drawer')).not.toBeInTheDocument()
    })

    it('remembers the sidebar being hidden across remounts (e.g. a reload)', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<StoryPageClient story={story} llmWritingEnabled={true} />)
      await waitFor(() => expect(screen.getByTestId('story-nav-drawer')).toBeInTheDocument())

      await user.click(screen.getByTestId('story-nav-toggle'))
      expect(screen.queryByTestId('story-nav-drawer')).not.toBeInTheDocument()
      unmount()

      render(<StoryPageClient story={story} llmWritingEnabled={true} />)
      expect(screen.queryByTestId('story-nav-drawer')).not.toBeInTheDocument()
    })

    it('remembers the sidebar being shown again after it was hidden, across remounts', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<StoryPageClient story={story} llmWritingEnabled={true} />)
      await waitFor(() => expect(screen.getByTestId('story-nav-drawer')).toBeInTheDocument())

      await user.click(screen.getByTestId('story-nav-toggle'))
      await user.click(screen.getByTestId('story-nav-toggle'))
      expect(screen.getByTestId('story-nav-drawer')).toBeInTheDocument()
      unmount()

      render(<StoryPageClient story={story} llmWritingEnabled={true} />)
      await waitFor(() => expect(screen.getByTestId('story-nav-drawer')).toBeInTheDocument())
    })
  })
})
