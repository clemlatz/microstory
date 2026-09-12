import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryPageClient } from './StoryPageClient'
import type { Story } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/lib/charactersApi', () => ({
  fetchCharacters: vi.fn().mockResolvedValue([]),
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
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
  createdAt: 1000,
  updatedAt: 2000,
  lastPassagePreview: null,
}

describe('StoryPageClient', () => {
  it('shows the story overview by default', async () => {
    render(<StoryPageClient story={story} llmWritingEnabled={true} />)
    expect(screen.getByTestId('story-title')).toHaveTextContent('Le Voyage de Nour')
  })

  it('switches to the manuscript and back', async () => {
    const user = userEvent.setup()
    render(<StoryPageClient story={story} llmWritingEnabled={true} />)

    await user.click(screen.getByTestId('open-manuscript-button'))
    await waitFor(() => expect(screen.getByTestId('story-overview-toggle')).toBeInTheDocument())

    await user.click(screen.getByTestId('story-overview-toggle'))
    expect(screen.getByTestId('story-title')).toBeInTheDocument()
  })

  it('hides the "Manuscrit" button and never reaches the manuscript when disabled', async () => {
    render(<StoryPageClient story={story} llmWritingEnabled={false} />)

    expect(screen.getByTestId('story-title')).toBeInTheDocument()
    expect(screen.queryByTestId('open-manuscript-button')).not.toBeInTheDocument()
  })
})
