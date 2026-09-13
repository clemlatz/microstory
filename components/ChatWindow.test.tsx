import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatWindow } from './ChatWindow'
import type { Message } from '@/lib/types'

vi.mock('@/lib/aiResponse', () => ({
  fetchAiResponse: vi.fn(),
  fetchMessages: vi.fn(),
  resetConversation: vi.fn(),
  resumeAiResponse: vi.fn(),
  stopGeneration: vi.fn(),
}))

vi.mock('@/lib/charactersApi', () => ({
  fetchCharacters: vi.fn(),
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
}))

vi.mock('@/lib/writerPromptApi', () => ({
  fetchWriterPrompt: vi.fn(),
  updateWriterPrompt: vi.fn(),
}))

vi.mock('@/lib/contextUsageApi', () => ({
  fetchContextUsage: vi.fn(),
}))

vi.mock('@/lib/summarizeApi', () => ({
  fetchSummary: vi.fn(),
}))

vi.mock('@/lib/conversationSummaryApi', () => ({
  persistConversationSummary: vi.fn(),
  fetchActiveConversationSummary: vi.fn(),
}))

vi.mock('@/lib/historyApi', () => ({
  fetchHistory: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import { fetchAiResponse, fetchMessages, resetConversation, resumeAiResponse, stopGeneration } from '@/lib/aiResponse'
import { fetchCharacters } from '@/lib/charactersApi'
import { fetchWriterPrompt } from '@/lib/writerPromptApi'
import { fetchContextUsage } from '@/lib/contextUsageApi'
import { fetchSummary } from '@/lib/summarizeApi'
import { persistConversationSummary, fetchActiveConversationSummary } from '@/lib/conversationSummaryApi'
import { fetchHistory } from '@/lib/historyApi'

const mockedFetchAiResponse = vi.mocked(fetchAiResponse)
const mockedFetchMessages = vi.mocked(fetchMessages)
const mockedResetConversation = vi.mocked(resetConversation)
const mockedResumeAiResponse = vi.mocked(resumeAiResponse)
const mockedStopGeneration = vi.mocked(stopGeneration)
const mockedFetchCharacters = vi.mocked(fetchCharacters)
const mockedFetchWriterPrompt = vi.mocked(fetchWriterPrompt)
const mockedFetchContextUsage = vi.mocked(fetchContextUsage)
const mockedFetchSummary = vi.mocked(fetchSummary)
const mockedPersistConversationSummary = vi.mocked(persistConversationSummary)
const mockedFetchActiveConversationSummary = vi.mocked(fetchActiveConversationSummary)
const mockedFetchHistory = vi.mocked(fetchHistory)

describe('ChatWindow', () => {
  beforeEach(() => {
    mockedFetchAiResponse.mockReset()
    mockedFetchMessages.mockReset()
    mockedResetConversation.mockReset()
    mockedFetchMessages.mockResolvedValue([])
    mockedResetConversation.mockResolvedValue(undefined)
    mockedResumeAiResponse.mockReset()
    mockedResumeAiResponse.mockResolvedValue({ resumed: false, fullContent: '' })
    mockedStopGeneration.mockReset()
    mockedStopGeneration.mockResolvedValue(undefined)
    mockedFetchCharacters.mockReset()
    mockedFetchCharacters.mockResolvedValue([])
    mockedFetchWriterPrompt.mockReset()
    mockedFetchWriterPrompt.mockResolvedValue('')
    mockedFetchContextUsage.mockReset()
    mockedFetchContextUsage.mockResolvedValue({
      usedTokens: 1000,
      maxTokens: 32768,
      pendingWords: 200,
      autoSummaryThresholdWords: 5000,
      modelName: 'local-model',
      modelLoaded: true,
      modelIsLoading: false,
    })
    mockedFetchSummary.mockReset()
    mockedPersistConversationSummary.mockReset()
    mockedFetchActiveConversationSummary.mockReset()
    mockedFetchActiveConversationSummary.mockResolvedValue({ summary: '', cutoffId: null })
    mockedFetchHistory.mockReset()
    mockedFetchHistory.mockResolvedValue({ messages: [], summaries: [], activeCutoffId: null })
  })

  it('sends the full message history to fetchAiResponse', async () => {
    mockedFetchAiResponse.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')

    expect(mockedFetchAiResponse).toHaveBeenCalledTimes(1)
    expect(mockedFetchAiResponse.mock.calls[0][0]).toBe('test-story')
    const calledWith = mockedFetchAiResponse.mock.calls[0][1]
    expect(calledWith).toHaveLength(1)
    expect(calledWith[0].content).toBe('Bonjour')
  })

  it('shows the activity indicator while streaming, then settles once the passage is generated', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')
    expect(screen.getByTestId('continue-activity-indicator')).toBeInTheDocument()

    await act(async () => {
      onChunkCallback('[TEXTE]Réponse')
    })
    expect(screen.getByTestId('story-passage')).toHaveTextContent('Réponse')

    await act(async () => {
      onChunkCallback(' simulée[/TEXTE]')
    })
    expect(screen.getAllByTestId('story-passage')).toHaveLength(1)
    expect(screen.getByTestId('story-passage')).toHaveTextContent('Réponse simulée')

    await act(async () => {
      resolveReply('[TEXTE]Réponse simulée[/TEXTE]')
    })
    expect(screen.getByTestId('continue-input')).not.toBeDisabled()
  })

  it('re-enables the input after fetchAiResponse fails before streaming anything', async () => {
    mockedFetchAiResponse.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')

    await waitFor(() => {
      expect(screen.getByTestId('continue-input')).not.toBeDisabled()
    })
    expect(screen.queryByTestId('story-passage')).not.toBeInTheDocument()
  })

  it('re-enables the input after a mid-stream error, without a story passage from the partial reply', async () => {
    mockedFetchAiResponse.mockImplementation(async (_storyId, _messages, onChunk) => {
      onChunk('Réponse partielle')
      throw new Error('stream interrupted')
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')

    await waitFor(() => {
      expect(screen.getByTestId('continue-input')).not.toBeDisabled()
    })
    expect(screen.queryByTestId('story-passage')).not.toBeInTheDocument()
  })

  it('re-enables the input when the error has no message (generic fallback)', async () => {
    mockedFetchAiResponse.mockRejectedValue(new Error())
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')

    await waitFor(() => {
      expect(screen.getByTestId('continue-input')).not.toBeDisabled()
    })
  })

  it('opens a confirmation dialog instead of resetting immediately when the reset button is clicked', async () => {
    const existing: Message[] = [
      { id: '1', role: 'user', content: 'Message existant', timestamp: 1000 },
    ]
    mockedFetchMessages.mockResolvedValue(existing)
    const user = userEvent.setup()

    render(<ChatWindow storyId="test-story" />)
    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())

    await user.click(screen.getByTestId('history-toggle'))
    await user.click(await screen.findByTestId('reset-button'))

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    expect(mockedResetConversation).not.toHaveBeenCalled()
  })

  it('leaves the conversation unchanged when the reset confirmation is cancelled', async () => {
    const existing: Message[] = [
      { id: '1', role: 'user', content: 'Message existant', timestamp: 1000 },
    ]
    mockedFetchMessages.mockResolvedValue(existing)
    const user = userEvent.setup()

    render(<ChatWindow storyId="test-story" />)
    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())

    await user.click(screen.getByTestId('history-toggle'))
    await user.click(await screen.findByTestId('reset-button'))
    await user.click(screen.getByTestId('confirm-dialog-cancel'))

    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
    expect(mockedResetConversation).not.toHaveBeenCalled()
  })

  it('clears the conversation when the reset is confirmed in the dialog', async () => {
    const existing: Message[] = [
      { id: 'u1', role: 'user', content: 'Raconte une histoire.', timestamp: 1000 },
      { id: 'a1', role: 'assistant', content: '[TEXTE]Il pleuvait.[/TEXTE]', timestamp: 2000 },
    ]
    mockedFetchMessages.mockResolvedValue(existing)
    const user = userEvent.setup()

    render(<ChatWindow storyId="test-story" />)
    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait.')

    await user.click(screen.getByTestId('history-toggle'))
    await user.click(await screen.findByTestId('reset-button'))
    await user.click(screen.getByTestId('confirm-dialog-confirm'))
    await user.click(screen.getByTestId('history-toggle'))

    await waitFor(() => {
      expect(screen.queryByTestId('story-passage')).not.toBeInTheDocument()
    })
    expect(mockedResetConversation).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
  })

  it('immediately clears the Historique view after a reset, without needing to leave and reopen it (issue #65)', async () => {
    const existing: Message[] = [
      { id: 'u1', role: 'user', content: 'Raconte une histoire.', timestamp: 1000 },
      { id: 'a1', role: 'assistant', content: '[TEXTE]Il pleuvait.[/TEXTE]', timestamp: 2000 },
    ]
    mockedFetchMessages.mockResolvedValue(existing)
    mockedFetchHistory.mockResolvedValue({
      messages: existing,
      summaries: [],
      activeCutoffId: null,
    })
    const user = userEvent.setup()

    render(<ChatWindow storyId="test-story" />)
    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())

    await user.click(screen.getByTestId('history-toggle'))
    expect(await screen.findByTestId('history-passage-item')).toHaveTextContent('Il pleuvait.')

    mockedFetchHistory.mockResolvedValue({ messages: [], summaries: [], activeCutoffId: null })

    await user.click(await screen.findByTestId('reset-button'))
    await user.click(screen.getByTestId('confirm-dialog-confirm'))

    expect(await screen.findByTestId('history-view-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('history-passage-item')).not.toBeInTheDocument()
  })

  it('toggles the config panel open and closed', async () => {
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('config-panel-toggle'))
    expect(screen.getByTestId('config-panel')).toBeInTheDocument()
    await waitFor(() => expect(mockedFetchWriterPrompt).toHaveBeenCalled())

    await user.click(screen.getByTestId('config-panel-toggle'))
    expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument()
  })

  it('shows a nav-toggle button when onOpenNav is provided, and calls it', async () => {
    const user = userEvent.setup()
    const onOpenNav = vi.fn()
    render(<ChatWindow storyId="test-story" onOpenNav={onOpenNav} />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.click(screen.getByTestId('story-nav-toggle'))

    expect(onOpenNav).toHaveBeenCalledTimes(1)
  })

  it('does not show a nav-toggle button when onOpenNav is not provided', async () => {
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    expect(screen.queryByTestId('story-nav-toggle')).not.toBeInTheDocument()
  })

  it('shows the LLM section with the configured model name and status', async () => {
    mockedFetchContextUsage.mockResolvedValue({
      usedTokens: 100,
      maxTokens: 32768,
      pendingWords: 50,
      autoSummaryThresholdWords: 5000,
      modelName: 'local-model',
      modelLoaded: true,
      modelIsLoading: false,
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.click(screen.getByTestId('config-panel-toggle'))

    await user.click(screen.getByTestId('config-panel-tab-llm'))

    await waitFor(() =>
      expect(screen.getByTestId('llm-model-name')).toHaveTextContent('local-model'),
    )
    expect(screen.getByTestId('llm-model-status')).toHaveTextContent('Loaded')
  })

  it('routes only [TEXTE] content to the manuscript view, leaving [CHAT] remarks out of it', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise(() => {})
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')

    await act(async () => {
      onChunkCallback('[CHAT]Voici un extrait ![/CHAT][TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })

    const passages = screen.getAllByTestId('story-passage')
    expect(passages).toHaveLength(1)
    expect(passages[0]).toHaveTextContent('Il pleuvait sur la lande.')
    expect(passages[0]).not.toHaveTextContent('Voici un extrait !')
  })

  it('re-enables the input and hides the activity indicator when Stop is clicked', async () => {
    let abortSignal: AbortSignal | undefined
    let rejectReply: (error: Error) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk, signal) => {
      abortSignal = signal
      onChunk('Réponse en cours')
      signal?.addEventListener('abort', () => {
        rejectReply(new DOMException('The operation was aborted.', 'AbortError'))
      })
      return new Promise((_resolve, reject) => {
        rejectReply = reject
      })
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')

    await waitFor(() => {
      expect(screen.getByTestId('continue-activity-indicator')).toBeInTheDocument()
    })
    expect(abortSignal).toBeInstanceOf(AbortSignal)

    await user.click(screen.getByTestId('continue-stop-button'))

    await waitFor(() => {
      expect(screen.getByTestId('continue-input')).not.toBeDisabled()
    })
    expect(screen.getByTestId('continue-send-button')).toBeInTheDocument()
    expect(screen.queryByTestId('continue-activity-indicator')).not.toBeInTheDocument()
  })

  it('keeps the prompt and the partial passage on screen, editable, after Stop is clicked mid-stream', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    let rejectReply: (error: Error) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk, signal) => {
      onChunkCallback = onChunk
      signal?.addEventListener('abort', () => {
        rejectReply(new DOMException('The operation was aborted.', 'AbortError'))
      })
      return new Promise((_resolve, reject) => {
        rejectReply = reject
      })
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Continue avec un dragon.{Enter}')

    await act(async () => {
      onChunkCallback('[TEXTE]Le dragon apparut')
    })

    await user.click(screen.getByTestId('continue-stop-button'))

    await waitFor(() => {
      expect(screen.getByTestId('story-current-prompt')).toHaveTextContent('Continue avec un dragon.')
    })
    expect(screen.getByTestId('story-passage')).toHaveTextContent('Le dragon apparut')
    expect(screen.getByTestId('edit-prompt-button')).toBeInTheDocument()
  })

  it('keeps just the dangling prompt editable when Stop is clicked before any chunk arrives', async () => {
    let rejectReply: (error: Error) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, _onChunk, signal) => {
      signal?.addEventListener('abort', () => {
        rejectReply(new DOMException('The operation was aborted.', 'AbortError'))
      })
      return new Promise((_resolve, reject) => {
        rejectReply = reject
      })
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Premier message.{Enter}')

    await waitFor(() => {
      expect(screen.getByTestId('continue-stop-button')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('continue-stop-button'))

    await waitFor(() => {
      expect(screen.getByTestId('story-current-prompt')).toHaveTextContent('Premier message.')
    })
    expect(screen.getByTestId('edit-prompt-button')).toBeInTheDocument()
  })

  it('resyncs the conversation with the server when the tab regains visibility', async () => {
    render(<ChatWindow storyId="test-story" />)
    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalledTimes(1))

    mockedFetchMessages.mockResolvedValueOnce([
      { id: '1', role: 'assistant', content: '[TEXTE]Nouveau passage.[/TEXTE]', timestamp: 2000 },
    ])

    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalledTimes(2))
    await waitFor(() => {
      expect(screen.getByTestId('story-passage')).toHaveTextContent('Nouveau passage.')
    })
  })

  it('does not race a plain fetchMessages() against a resumed generation on mount', async () => {
    // Regression test: syncWithServer used to fire a standalone
    // fetchMessages().then(setMessages) unconditionally alongside
    // resumeInProgressGeneration(). If that standalone call resolved after
    // the resume flow's own post-completion refetch, it silently clobbered
    // the correctly-resumed state (activity indicator + new passage) with
    // the stale pre-generation history — reproducing the "reload mid
    // generation shows the old passage with no activity indicator" bug.
    const finalMessages = [
      { id: 'u1', role: 'user' as const, content: 'Premier prompt', timestamp: 1 },
      { id: 'a1', role: 'assistant' as const, content: '[TEXTE]Ancien passage[/TEXTE]', timestamp: 2 },
      { id: 'u2', role: 'user' as const, content: 'Deuxieme prompt', timestamp: 3 },
      { id: 'a2', role: 'assistant' as const, content: '[TEXTE]Nouveau passage en cours[/TEXTE]', timestamp: 4 },
    ]
    mockedFetchMessages.mockResolvedValue(finalMessages)
    mockedResumeAiResponse.mockImplementation(async (_storyId, onResuming, onChunk) => {
      onResuming()
      onChunk('[TEXTE]Nouveau passage en cours')
      await Promise.resolve()
      return { resumed: true, fullContent: '[TEXTE]Nouveau passage en cours' }
    })

    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Nouveau passage en cours'))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByTestId('story-passage')).toHaveTextContent('Nouveau passage en cours')
    expect(mockedFetchMessages).toHaveBeenCalledTimes(1)
  })

  it('does not resync when the tab regains visibility while this tab is actively streaming its own generation', async () => {
    mockedFetchAiResponse.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalledTimes(1))
    await user.type(screen.getByTestId('continue-input'), 'Continue{Enter}')
    await waitFor(() => expect(screen.getByTestId('continue-stop-button')).toBeInTheDocument())

    document.dispatchEvent(new Event('visibilitychange'))

    expect(mockedFetchMessages).toHaveBeenCalledTimes(1)
  })

  it('does not show a generating indicator above the passage — the floating input itself becomes the activity indicator (issue #39)', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')

    // No prior passage yet, and no indicator above the (nonexistent) passage.
    expect(screen.queryByTestId('story-generating-indicator')).not.toBeInTheDocument()

    await act(async () => {
      onChunkCallback('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    expect(screen.getAllByTestId('story-passage')).toHaveLength(1)

    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise(() => {})
    })
    await user.type(screen.getByTestId('continue-input'), 'Continue{Enter}')

    // The floating input itself is replaced by the activity indicator; the
    // manuscript above the passage never shows its own generating indicator.
    expect(screen.queryByTestId('story-generating-indicator')).not.toBeInTheDocument()
    expect(screen.queryByTestId('continue-input')).not.toBeInTheDocument()
    expect(screen.getByTestId('continue-activity-indicator')).toBeInTheDocument()

    await act(async () => {
      onChunkCallback('[TEXTE]Le vent redoublait.[/TEXTE]')
    })

    expect(screen.queryByTestId('story-generating-indicator')).not.toBeInTheDocument()
  })

  it('shows a "thinking" label on the floating activity indicator during prefill, then switches to "writing" once the first chunk arrives (issue #26, #39)', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')

    await act(async () => {
      onChunkCallback('[TEXTE]Premier passage.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Premier passage.[/TEXTE]')
    })
    expect(screen.getAllByTestId('story-passage')).toHaveLength(1)

    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise(() => {})
    })
    await user.type(screen.getByTestId('continue-input'), 'Continue{Enter}')

    // Before the first chunk of the new turn arrives, the label reflects
    // the prefill phase rather than "writing".
    expect(screen.getByTestId('continue-activity-indicator')).toHaveTextContent('Thinking…')

    await act(async () => {
      onChunkCallback('[TEXTE]Le vent redoublait.[/TEXTE]')
    })

    expect(screen.getByTestId('continue-activity-indicator')).toHaveTextContent("Writing…")
  })

  it('shows the context gauge with the pending/threshold words fetched on mount', async () => {
    mockedFetchContextUsage.mockResolvedValue({
      usedTokens: 8192,
      maxTokens: 32768,
      pendingWords: 1200,
      autoSummaryThresholdWords: 5000,
      modelName: 'local-model',
      modelLoaded: true,
      modelIsLoading: false,
    })
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchContextUsage).toHaveBeenCalled())
    await waitFor(() => {
      expect(screen.getByTestId('context-gauge')).toHaveAttribute(
        'title',
        '1200 / 5000 words before automatic summary',
      )
    })
  })

  it('still shows the context gauge when maxTokens is unavailable', async () => {
    mockedFetchContextUsage.mockResolvedValue({
      usedTokens: 500,
      maxTokens: null,
      pendingWords: 300,
      autoSummaryThresholdWords: 5000,
      modelName: 'hosted-model',
      modelLoaded: null,
      modelIsLoading: null,
    })
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchContextUsage).toHaveBeenCalled())
    expect(screen.getByTestId('context-gauge')).toBeInTheDocument()
  })

  it('refreshes the context gauge after a message exchange completes', async () => {
    mockedFetchContextUsage.mockResolvedValueOnce({
      usedTokens: 1000,
      maxTokens: 32768,
      pendingWords: 1000,
      autoSummaryThresholdWords: 5000,
      modelName: 'local-model',
      modelLoaded: true,
      modelIsLoading: false,
    })
    mockedFetchAiResponse.mockResolvedValue('[CHAT]Salut ![/CHAT]')
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchContextUsage).toHaveBeenCalledTimes(1))
    mockedFetchContextUsage.mockResolvedValueOnce({
      usedTokens: 5000,
      maxTokens: 32768,
      pendingWords: 4000,
      autoSummaryThresholdWords: 5000,
      modelName: 'local-model',
      modelLoaded: true,
      modelIsLoading: false,
    })

    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')

    await waitFor(() => expect(mockedFetchContextUsage).toHaveBeenCalledTimes(2))
    await waitFor(() => {
      expect(screen.getByTestId('context-gauge')).toHaveAttribute(
        'title',
        '4000 / 5000 words before automatic summary',
      )
    })
  })

  it('refreshes the context gauge after resetting the conversation', async () => {
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchContextUsage).toHaveBeenCalledTimes(1))
    mockedFetchContextUsage.mockResolvedValueOnce({
      usedTokens: 0,
      maxTokens: 32768,
      pendingWords: 0,
      autoSummaryThresholdWords: 5000,
      modelName: 'local-model',
      modelLoaded: true,
      modelIsLoading: false,
    })

    await user.click(screen.getByTestId('history-toggle'))
    await user.click(await screen.findByTestId('reset-button'))
    await user.click(screen.getByTestId('confirm-dialog-confirm'))

    await waitFor(() => expect(mockedFetchContextUsage).toHaveBeenCalledTimes(2))
  })

  it('disables the summarize button until a passage exists', async () => {
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.click(screen.getByTestId('history-toggle'))
    expect(await screen.findByTestId('summarize-button')).toBeDisabled()
  })

  it('replaces the displayed passage with a summary of the whole generated text so far, without touching the underlying text', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    mockedFetchSummary.mockImplementation(async (_storyId, onChunk) => {
      onChunk('Il pleuvait.')
      return 'Il pleuvait.'
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')
    await act(async () => {
      onChunkCallback('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait sur la lande.'))

    await user.click(screen.getByTestId('history-toggle'))
    await user.click(await screen.findByTestId('summarize-button'))
    await waitFor(() => expect(screen.getByTestId('summarize-button')).toBeDisabled())
    // The server now derives what to summarize itself (issue #58); the
    // client no longer sends the manuscript text as an argument.
    expect(mockedFetchSummary).toHaveBeenCalledWith('test-story', expect.any(Function))

    await user.click(screen.getByTestId('history-toggle'))
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait.'))
  })

  it('reverts to showing the real text once a new passage is generated after a summary', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    mockedFetchSummary.mockImplementation(async (_storyId, onChunk) => {
      onChunk('Il pleuvait.')
      return 'Il pleuvait.'
    })
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')
    await act(async () => {
      onChunkCallback('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait sur la lande.'))
    await user.click(screen.getByTestId('history-toggle'))
    await user.click(await screen.findByTestId('summarize-button'))
    await user.click(screen.getByTestId('history-toggle'))
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait.'))

    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    await user.type(screen.getByTestId('continue-input'), 'Continue{Enter}')
    await act(async () => {
      onChunkCallback('[TEXTE]Le vent redoublait.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Le vent redoublait.[/TEXTE]')
    })

    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Le vent redoublait.'))
    await user.click(screen.getByTestId('history-toggle'))
    expect(await screen.findByTestId('summarize-button')).not.toBeDisabled()
  })

  // Issue #47: when the active compaction summary's cutoff message is at or
  // after the message backing the manuscript's last passage, that summary
  // is more up to date than the displayed passage — show it instead, with
  // the same "Résumé" indication used for the on-demand preview.
  it('shows the active summary instead of the last passage when its cutoff is more recent (issue #47)', async () => {
    mockedFetchMessages.mockResolvedValue([
      { id: 'msg-1', role: 'user', content: 'Bonjour', timestamp: 1 },
      { id: 'msg-2', role: 'assistant', content: '[TEXTE]Il pleuvait sur la lande.[/TEXTE]', timestamp: 2 },
    ])
    mockedFetchActiveConversationSummary.mockResolvedValue({
      summary: 'Résumé automatique de la conversation.',
      cutoffId: 'msg-2',
    })

    render(<ChatWindow storyId="test-story" />)

    await waitFor(() =>
      expect(screen.getByTestId('story-passage')).toHaveTextContent('Résumé automatique de la conversation.'),
    )
    expect(screen.getByTestId('story-summary-label')).toHaveTextContent('Summary')
    expect(screen.queryByTestId('rewrite-button')).not.toBeInTheDocument()
  })

  it('keeps showing the last passage when the active summary cutoff is older than it', async () => {
    mockedFetchMessages.mockResolvedValue([
      { id: 'msg-1', role: 'user', content: 'Bonjour', timestamp: 1 },
      { id: 'msg-2', role: 'assistant', content: '[TEXTE]Il pleuvait sur la lande.[/TEXTE]', timestamp: 2 },
      { id: 'msg-3', role: 'user', content: 'Continue', timestamp: 3 },
      { id: 'msg-4', role: 'assistant', content: '[TEXTE]Le vent redoublait.[/TEXTE]', timestamp: 4 },
    ])
    mockedFetchActiveConversationSummary.mockResolvedValue({
      summary: 'Résumé du tout premier passage.',
      cutoffId: 'msg-2',
    })

    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Le vent redoublait.'))
    expect(screen.queryByTestId('story-summary-label')).not.toBeInTheDocument()
  })

  it('shows a "thinking" label during a summary\'s prefill, then switches to "summarizing" once its first chunk arrives, on the floating activity bar (issues #34, #54)', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    let onSummaryChunkCallback: (text: string) => void = () => {}
    let resolveSummary: (value: string) => void = () => {}
    mockedFetchSummary.mockImplementation(
      (_storyId, onChunk) =>
        new Promise((resolve) => {
          onSummaryChunkCallback = onChunk
          resolveSummary = resolve
        }),
    )
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')
    await act(async () => {
      onChunkCallback('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait sur la lande.'))

    await user.click(screen.getByTestId('history-toggle'))
    await user.click(await screen.findByTestId('summarize-button'))
    await user.click(screen.getByTestId('history-toggle'))

    // The floating "Continuer" input is replaced by the activity bar for the
    // whole duration of the summary (issue #54), same as a normal generation
    // or a rewrite. Unlike a normal generation, the label stays "En train de
    // résumer…" for the whole duration, including the prefill phase before
    // the first chunk arrives — there is no separate "réfléchir" label here.
    expect(screen.queryByTestId('continue-input')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('continue-activity-indicator')).toHaveTextContent('Summarizing…'))

    await act(async () => {
      onSummaryChunkCallback('Il pleuvait.')
    })

    expect(screen.getByTestId('continue-activity-indicator')).toHaveTextContent('Summarizing…')

    // Unlike a normal generation or a rewrite, a manual summary has no
    // cancellation mechanism, so its activity bar shows no Stop button.
    expect(screen.queryByTestId('continue-stop-button')).not.toBeInTheDocument()

    await act(async () => {
      resolveSummary('Il pleuvait.')
    })

    await waitFor(() => expect(screen.getByTestId('continue-input')).toBeInTheDocument())
  })

  // Issue #44: the summary is now persisted as the compaction context
  // automatically, as soon as it finishes generating — no "Utiliser comme
  // contexte" click required (that button no longer exists at all).
  it('automatically persists the summary as the compaction context once it finishes generating', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    mockedFetchSummary.mockImplementation(async (_storyId, onChunk) => {
      onChunk('Il pleuvait.')
      return 'Il pleuvait.'
    })
    mockedPersistConversationSummary.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')
    await act(async () => {
      onChunkCallback('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait sur la lande.'))

    await user.click(screen.getByTestId('history-toggle'))
    await user.click(await screen.findByTestId('summarize-button'))
    await user.click(screen.getByTestId('history-toggle'))
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait.'))

    await waitFor(() =>
      expect(mockedPersistConversationSummary).toHaveBeenCalledWith('test-story', 'Il pleuvait.'),
    )
    expect(screen.queryByTestId('use-summary-as-context-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('edit-summary-button')).not.toBeInTheDocument()
  })

  it('does not persist anything when the summary comes back empty', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    mockedFetchSummary.mockResolvedValue('')
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')
    await act(async () => {
      onChunkCallback('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait sur la lande.'))

    await user.click(screen.getByTestId('history-toggle'))
    await user.click(await screen.findByTestId('summarize-button'))
    await waitFor(() => expect(screen.getByTestId('summarize-button')).not.toBeDisabled())

    expect(mockedPersistConversationSummary).not.toHaveBeenCalled()
  })

  it('shows an error message when summarizing fails, instead of failing silently', async () => {
    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    mockedFetchSummary.mockRejectedValue(new Error('no new passages to summarize'))
    const user = userEvent.setup()
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')
    await act(async () => {
      onChunkCallback('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait sur la lande.'))

    await user.click(screen.getByTestId('history-toggle'))
    await user.click(await screen.findByTestId('summarize-button'))

    await waitFor(() => {
      expect(screen.getByTestId('summarize-error')).toHaveTextContent('no new passages to summarize')
    })
    expect(mockedPersistConversationSummary).not.toHaveBeenCalled()
  })

  it('hides the edit-prompt control until a passage exists', async () => {
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    expect(screen.queryByTestId('edit-prompt-button')).not.toBeInTheDocument()
  })

  // Helper shared by the tests below: sends one normal turn so a passage
  // exists and the "Modifier le prompt" button becomes available.
  async function sendFirstTurn(user: ReturnType<typeof userEvent.setup>) {
    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })
    render(<ChatWindow storyId="test-story" />)

    await waitFor(() => expect(mockedFetchMessages).toHaveBeenCalled())
    await user.type(screen.getByTestId('continue-input'), 'Bonjour{Enter}')
    await act(async () => {
      onChunkCallback('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Il pleuvait sur la lande.[/TEXTE]')
    })
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il pleuvait sur la lande.'))
  }

  it('clicking the button switches the floating input into edit-prompt mode, prefilled with the last prompt, with an "Enregistrer" submit button', async () => {
    const user = userEvent.setup()
    await sendFirstTurn(user)

    await user.click(screen.getByTestId('edit-prompt-button'))

    expect(screen.getByTestId('continue-input')).toHaveValue('Bonjour')
    expect(screen.getByTestId('continue-send-button')).toHaveTextContent('Save')
    expect(screen.getByTestId('continue-cancel-edit-button')).toBeInTheDocument()
  })

  it('cancelling edit-prompt mode before sending returns to the normal "Continuer" input, sending nothing', async () => {
    const user = userEvent.setup()
    await sendFirstTurn(user)

    await user.click(screen.getByTestId('edit-prompt-button'))
    await user.click(screen.getByTestId('continue-cancel-edit-button'))

    expect(screen.getByTestId('continue-send-button')).toHaveTextContent('Send')
    expect(screen.queryByTestId('continue-cancel-edit-button')).not.toBeInTheDocument()
    expect(mockedFetchAiResponse).toHaveBeenCalledTimes(1) // only the original sendFirstTurn call
  })

  it('does not allow submitting a blank edited prompt', async () => {
    const user = userEvent.setup()
    await sendFirstTurn(user)
    const callsBeforeEdit = mockedFetchAiResponse.mock.calls.length

    await user.click(screen.getByTestId('edit-prompt-button'))
    await user.clear(screen.getByTestId('continue-input'))
    await user.type(screen.getByTestId('continue-input'), '{Enter}')

    expect(mockedFetchAiResponse).toHaveBeenCalledTimes(callsBeforeEdit)
    expect(screen.getByTestId('continue-input')).toBeInTheDocument()
  })

  it('deletes the old prompt/passage turn and generates a new one from the edited text, exactly like a normal send', async () => {
    const user = userEvent.setup()
    await sendFirstTurn(user)

    let capturedMessages: Message[] | undefined
    mockedFetchAiResponse.mockImplementation(async (_storyId, messages, onChunk) => {
      capturedMessages = messages
      onChunk('[TEXTE]Il faisait beau.[/TEXTE]')
      return '[TEXTE]Il faisait beau.[/TEXTE]'
    })

    await user.click(screen.getByTestId('edit-prompt-button'))
    await user.clear(screen.getByTestId('continue-input'))
    await user.type(screen.getByTestId('continue-input'), 'Bonsoir{Enter}')

    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il faisait beau.'))
    // The old turn (user "Bonjour" + assistant "Il pleuvait...") is gone from
    // what gets sent to the LLM — only the new "Bonsoir" turn remains, exactly
    // as if it had been typed into "Continuer" on an empty conversation.
    expect(capturedMessages).toEqual([expect.objectContaining({ role: 'user', content: 'Bonsoir' })])
    expect(screen.queryByText('Il pleuvait sur la lande.')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('story-passage')).toHaveLength(1)

    // The input returns to the normal "Continuer" mode automatically once
    // the new generation finishes.
    await waitFor(() => expect(screen.getByTestId('continue-send-button')).toHaveTextContent('Send'))
    expect(screen.queryByTestId('continue-cancel-edit-button')).not.toBeInTheDocument()
  })

  it('shows the same generation activity indicator for an edited prompt as for a normal send', async () => {
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReply = resolve
        }),
    )
    const user = userEvent.setup()
    await sendFirstTurn(user)

    await user.click(screen.getByTestId('edit-prompt-button'))
    await user.clear(screen.getByTestId('continue-input'))
    await user.type(screen.getByTestId('continue-input'), 'Bonsoir{Enter}')

    await waitFor(() =>
      expect(screen.getByTestId('continue-activity-indicator')).toHaveTextContent('Thinking…'),
    )
    expect(screen.queryByTestId('continue-input')).not.toBeInTheDocument()

    await act(async () => {
      resolveReply('[TEXTE]Il faisait beau.[/TEXTE]')
    })
  })

  it('shows the sent (edited) prompt above the manuscript while the new passage streams in, replacing the old passage immediately', async () => {
    const user = userEvent.setup()
    await sendFirstTurn(user)

    let onChunkCallback: (text: string) => void = () => {}
    let resolveReply: (value: string) => void = () => {}
    mockedFetchAiResponse.mockImplementation((_storyId, _messages, onChunk) => {
      onChunkCallback = onChunk
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    })

    await user.click(screen.getByTestId('edit-prompt-button'))
    await user.clear(screen.getByTestId('continue-input'))
    await user.type(screen.getByTestId('continue-input'), 'Bonsoir{Enter}')

    await waitFor(() => expect(screen.getByTestId('story-pending-prompt')).toHaveTextContent('Bonsoir'))
    expect(screen.queryByText('Il pleuvait sur la lande.')).not.toBeInTheDocument()

    await act(async () => {
      onChunkCallback('[TEXTE]Il faisait beau.[/TEXTE]')
    })
    await act(async () => {
      resolveReply('[TEXTE]Il faisait beau.[/TEXTE]')
    })
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Il faisait beau.'))
  })

  it('prefills edit-prompt mode with the actual last prompt sent, not a stale one, after a first edit', async () => {
    const user = userEvent.setup()
    await sendFirstTurn(user)

    mockedFetchAiResponse.mockImplementation(async (_storyId, _messages, onChunk) => {
      onChunk('[TEXTE]Une phrase.[/TEXTE]')
      return '[TEXTE]Une phrase.[/TEXTE]'
    })

    await user.click(screen.getByTestId('edit-prompt-button'))
    await user.clear(screen.getByTestId('continue-input'))
    await user.type(screen.getByTestId('continue-input'), 'en une phrase{Enter}')
    await waitFor(() => expect(screen.getByTestId('story-passage')).toHaveTextContent('Une phrase.'))
    await waitFor(() => expect(screen.getByTestId('continue-send-button')).toHaveTextContent('Send'))

    // Reopening edit-prompt mode prefills the field with the prompt that was
    // actually just sent ("en une phrase"), not the original ("Bonjour").
    await user.click(screen.getByTestId('edit-prompt-button'))
    expect(screen.getByTestId('continue-input')).toHaveValue('en une phrase')
  })

  describe('history view (issue #36)', () => {
    it('toggles the read-only history view in place of the manuscript, hiding the floating input and edit-prompt button', async () => {
      mockedFetchMessages.mockResolvedValue([
        { id: 'u1', role: 'user', content: 'Raconte une histoire.', timestamp: 1000 },
        { id: 'a1', role: 'assistant', content: '[TEXTE]Il pleuvait.[/TEXTE]', timestamp: 2000 },
      ])
      const user = userEvent.setup()
      render(<ChatWindow storyId="test-story" />)

      await waitFor(() => expect(screen.getByTestId('story-view')).toBeInTheDocument())
      expect(screen.getByTestId('continue-input')).toBeInTheDocument()

      await user.click(screen.getByTestId('history-toggle'))

      await waitFor(() => expect(mockedFetchHistory).toHaveBeenCalled())
      expect(screen.queryByTestId('story-view')).not.toBeInTheDocument()
      expect(screen.queryByTestId('continue-input')).not.toBeInTheDocument()
      expect(screen.queryByTestId('edit-prompt-button')).not.toBeInTheDocument()

      await user.click(screen.getByTestId('history-toggle'))

      expect(screen.getByTestId('story-view')).toBeInTheDocument()
      expect(screen.getByTestId('continue-input')).toBeInTheDocument()
    })
  })
})
