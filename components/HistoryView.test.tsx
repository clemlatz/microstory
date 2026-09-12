import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/historyApi', () => ({
  fetchHistory: vi.fn(),
}))

vi.mock('@/lib/conversationSummariesApi', () => ({
  updateConversationSummary: vi.fn(),
}))

import { HistoryView } from './HistoryView'
import { fetchHistory } from '@/lib/historyApi'
import { updateConversationSummary } from '@/lib/conversationSummariesApi'

const mockedFetchHistory = vi.mocked(fetchHistory)
const mockedUpdateConversationSummary = vi.mocked(updateConversationSummary)

describe('HistoryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state before the history has been fetched', () => {
    mockedFetchHistory.mockReturnValue(new Promise(() => {}))

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />)

    expect(screen.getByTestId('history-view-loading')).toBeInTheDocument()
  })

  it('shows an empty state when there is no history yet', async () => {
    mockedFetchHistory.mockResolvedValue({ messages: [], summaries: [], activeCutoffId: null })

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />)

    expect(await screen.findByTestId('history-view-empty')).toBeInTheDocument()
    expect(screen.getByTestId('reset-button')).toBeInTheDocument()
    expect(screen.getByTestId('summarize-button')).toBeInTheDocument()
  })

  it('renders the reset and summarize buttons after the last item, wired to the passed-in handlers (issues #46, #67)', async () => {
    const user = userEvent.setup()
    const onOpenResetConfirm = vi.fn()
    const onSummarize = vi.fn()
    mockedFetchHistory.mockResolvedValue({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Prompt 1', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: '[TEXTE]Passage 1.[/TEXTE]', timestamp: 2 },
      ],
      summaries: [],
      activeCutoffId: null,
    })

    render(
      <HistoryView storyId="test-story" onOpenResetConfirm={onOpenResetConfirm} onSummarize={onSummarize} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />,
    )

    await waitFor(() => expect(screen.getByTestId('history-view')).toBeInTheDocument())
    expect(screen.getByTestId('reset-button')).toHaveTextContent('Clear')
    expect(screen.getByTestId('summarize-button')).toHaveTextContent('Summarize')
    expect(screen.getByTestId('summarize-button')).not.toBeDisabled()

    await user.click(screen.getByTestId('reset-button'))
    expect(onOpenResetConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByTestId('summarize-button'))
    expect(onSummarize).toHaveBeenCalledTimes(1)
  })

  it('disables the summarize button when isSummarizeDisabled is true', async () => {
    mockedFetchHistory.mockResolvedValue({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Prompt 1', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: '[TEXTE]Passage 1.[/TEXTE]', timestamp: 2 },
      ],
      summaries: [],
      activeCutoffId: null,
    })

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled onEditHistoryPrompt={vi.fn()} />)

    await waitFor(() => expect(screen.getByTestId('history-view')).toBeInTheDocument())
    expect(screen.getByTestId('summarize-button')).toBeDisabled()
  })

  it('refetches and clears stale content when remounted via a changed key (issue #65)', async () => {
    // Mirrors how `ChatWindow` actually triggers a refresh after a reset:
    // bumping the `key` it renders `HistoryView` with, forcing React to
    // discard the old instance and mount a fresh one — rather than any prop
    // `HistoryView` itself reacts to.
    mockedFetchHistory.mockResolvedValueOnce({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Prompt 1', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: '[TEXTE]Passage 1.[/TEXTE]', timestamp: 2 },
      ],
      summaries: [],
      activeCutoffId: null,
    })

    const { rerender } = render(
      <HistoryView
        key={0}
        storyId="test-story"
        onOpenResetConfirm={vi.fn()}
        onSummarize={vi.fn()}
        isSummarizeDisabled={false}
        onEditHistoryPrompt={vi.fn()}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('history-view')).toBeInTheDocument())
    expect(screen.getByText('Prompt 1')).toBeInTheDocument()

    let resolveSecondFetch: (value: { messages: never[]; summaries: never[]; activeCutoffId: null }) => void = () => {}
    mockedFetchHistory.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecondFetch = resolve
      }),
    )

    rerender(
      <HistoryView
        key={1}
        storyId="test-story"
        onOpenResetConfirm={vi.fn()}
        onSummarize={vi.fn()}
        isSummarizeDisabled={false}
        onEditHistoryPrompt={vi.fn()}
      />,
    )

    // The stale content disappears immediately, before the refetch resolves.
    await waitFor(() => expect(screen.getByTestId('history-view-loading')).toBeInTheDocument())
    expect(screen.queryByText('Prompt 1')).not.toBeInTheDocument()

    resolveSecondFetch({ messages: [], summaries: [], activeCutoffId: null })
    expect(await screen.findByTestId('history-view-empty')).toBeInTheDocument()
    expect(mockedFetchHistory).toHaveBeenCalledTimes(2)
  })

  it('renders every prompt and passage in chronological order when there is no active summary', async () => {
    mockedFetchHistory.mockResolvedValue({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Raconte une histoire.', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: '[CHAT]Bien sûr ![/CHAT][TEXTE]Il pleuvait.[/TEXTE]', timestamp: 2 },
        { id: 'msg-3', role: 'user', content: 'Continue.', timestamp: 3 },
        { id: 'msg-4', role: 'assistant', content: '[TEXTE]Le soleil revint.[/TEXTE]', timestamp: 4 },
      ],
      summaries: [],
      activeCutoffId: null,
    })

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />)

    await waitFor(() => expect(screen.getByTestId('history-view')).toBeInTheDocument())

    const prompts = screen.getAllByTestId('history-prompt-item')
    const passages = screen.getAllByTestId('history-passage-item')
    expect(prompts).toHaveLength(2)
    expect(passages).toHaveLength(2)
    expect(prompts[0]).toHaveTextContent('Raconte une histoire.')
    expect(passages[0]).toHaveTextContent('Il pleuvait.')
    expect(passages[0]).toHaveTextContent('Bien sûr !')
    expect(prompts[1]).toHaveTextContent('Continue.')
    expect(passages[1]).toHaveTextContent('Le soleil revint.')
  })

  it('shows only the active summary and the messages after its cutoff, dropping everything older (issue #60)', async () => {
    mockedFetchHistory.mockResolvedValue({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Prompt 1', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: '[TEXTE]Passage 1.[/TEXTE]', timestamp: 2 },
        { id: 'msg-3', role: 'user', content: 'Prompt 2', timestamp: 3 },
        { id: 'msg-4', role: 'assistant', content: '[TEXTE]Passage 2.[/TEXTE]', timestamp: 4 },
      ],
      summaries: [
        { id: 'sum-1', content: 'Résumé jusque-là.', cutoffMessageId: 'msg-2', createdAt: 10, type: 'auto' },
      ],
      activeCutoffId: 'msg-2',
    })

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />)

    const items = await screen.findAllByTestId(/history-(prompt|passage|summary)-item/)
    expect(items.map((item) => item.getAttribute('data-testid'))).toEqual([
      'history-summary-item',
      'history-prompt-item',
      'history-passage-item',
    ])
    expect(screen.getByTestId('history-summary-item')).toHaveTextContent('Résumé jusque-là.')
    expect(screen.getByTestId('history-prompt-item')).toHaveTextContent('Prompt 2')
    expect(screen.getByTestId('history-passage-item')).toHaveTextContent('Passage 2.')
    expect(screen.queryByText('Prompt 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Passage 1.')).not.toBeInTheDocument()
  })

  it('shows no summary, and every message, when the last summary is no longer the active one', async () => {
    mockedFetchHistory.mockResolvedValue({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Prompt 1', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: '[TEXTE]Passage 1.[/TEXTE]', timestamp: 2 },
      ],
      summaries: [
        { id: 'sum-1', content: 'Résumé ancien.', cutoffMessageId: 'msg-2', createdAt: 10, type: 'auto' },
      ],
      activeCutoffId: null,
    })

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />)

    await waitFor(() => expect(screen.getByTestId('history-view')).toBeInTheDocument())

    expect(screen.queryByTestId('history-summary-item')).not.toBeInTheDocument()
    expect(screen.getByTestId('history-prompt-item')).toHaveTextContent('Prompt 1')
    expect(screen.getByTestId('history-passage-item')).toHaveTextContent('Passage 1.')
  })

  it('scrolls the history container to the bottom once the history has rendered', async () => {
    const scrollHeightSpy = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(900)

    mockedFetchHistory.mockResolvedValue({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Prompt 1', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: '[TEXTE]Passage 1.[/TEXTE]', timestamp: 2 },
      ],
      summaries: [],
      activeCutoffId: null,
    })

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />)

    const container = await screen.findByTestId('history-view')

    await waitFor(() => expect(container.scrollTop).toBe(900))

    scrollHeightSpy.mockRestore()
  })

  it('shows an error message when fetching the history fails', async () => {
    mockedFetchHistory.mockRejectedValue(new Error('boom'))

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />)

    expect(await screen.findByTestId('history-view-error')).toHaveTextContent('boom')
  })

  it('lets a summary be edited and shows the saved content afterward', async () => {
    const user = userEvent.setup()
    mockedFetchHistory.mockResolvedValue({
      messages: [{ id: 'msg-1', role: 'user', content: 'Prompt 1', timestamp: 1 }],
      summaries: [
        { id: 'sum-1', content: 'Résumé initial.', cutoffMessageId: 'msg-1', createdAt: 10, type: 'auto' },
      ],
      activeCutoffId: 'msg-1',
    })
    mockedUpdateConversationSummary.mockResolvedValue({
      id: 'sum-1',
      content: 'Résumé corrigé.',
      cutoffMessageId: 'msg-1',
      createdAt: 10,
      type: 'auto',
    })

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />)

    await screen.findByTestId('history-summary-item')
    expect(screen.getByTestId('history-summary-item')).toHaveTextContent('Résumé initial.')

    await user.click(screen.getByTestId('history-summary-edit-button'))

    const textarea = screen.getByTestId('history-summary-edit-textarea')
    expect(textarea).toHaveValue('Résumé initial.')
    await user.clear(textarea)
    await user.type(textarea, 'Résumé corrigé.')

    await user.click(screen.getByTestId('history-summary-save-button'))

    expect(mockedUpdateConversationSummary).toHaveBeenCalledWith('test-story', 'sum-1', 'Résumé corrigé.')
    await waitFor(() =>
      expect(screen.getByTestId('history-summary-item')).toHaveTextContent('Résumé corrigé.'),
    )
    expect(screen.queryByTestId('history-summary-edit-textarea')).not.toBeInTheDocument()
  })

  it('cancelling an edit discards the draft and keeps the original content', async () => {
    const user = userEvent.setup()
    mockedFetchHistory.mockResolvedValue({
      messages: [{ id: 'msg-1', role: 'user', content: 'Prompt 1', timestamp: 1 }],
      summaries: [
        { id: 'sum-1', content: 'Résumé initial.', cutoffMessageId: 'msg-1', createdAt: 10, type: 'manual' },
      ],
      activeCutoffId: 'msg-1',
    })

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />)

    await screen.findByTestId('history-summary-item')
    await user.click(screen.getByTestId('history-summary-edit-button'))

    const textarea = screen.getByTestId('history-summary-edit-textarea')
    await user.clear(textarea)
    await user.type(textarea, 'Brouillon abandonné.')

    await user.click(screen.getByTestId('history-summary-cancel-button'))

    expect(mockedUpdateConversationSummary).not.toHaveBeenCalled()
    expect(screen.getByTestId('history-summary-item')).toHaveTextContent('Résumé initial.')
    expect(screen.queryByTestId('history-summary-edit-textarea')).not.toBeInTheDocument()
  })

  it('shows an error and stays in edit mode when saving a summary edit fails', async () => {
    const user = userEvent.setup()
    mockedFetchHistory.mockResolvedValue({
      messages: [{ id: 'msg-1', role: 'user', content: 'Prompt 1', timestamp: 1 }],
      summaries: [
        { id: 'sum-1', content: 'Résumé initial.', cutoffMessageId: 'msg-1', createdAt: 10, type: 'auto' },
      ],
      activeCutoffId: 'msg-1',
    })
    mockedUpdateConversationSummary.mockRejectedValue(new Error('échec réseau'))

    render(<HistoryView storyId="test-story" onOpenResetConfirm={vi.fn()} onSummarize={vi.fn()} isSummarizeDisabled={false} onEditHistoryPrompt={vi.fn()} />)

    await screen.findByTestId('history-summary-item')
    await user.click(screen.getByTestId('history-summary-edit-button'))
    await user.click(screen.getByTestId('history-summary-save-button'))

    expect(await screen.findByText('échec réseau')).toBeInTheDocument()
    expect(screen.getByTestId('history-summary-edit-textarea')).toBeInTheDocument()
  })

  it('lets any prompt be edited, calling onEditHistoryPrompt with its id and the new text (issue #68)', async () => {
    const user = userEvent.setup()
    const onEditHistoryPrompt = vi.fn()
    mockedFetchHistory.mockResolvedValue({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Raconte une histoire.', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: '[TEXTE]Il pleuvait.[/TEXTE]', timestamp: 2 },
        { id: 'msg-3', role: 'user', content: 'Continue.', timestamp: 3 },
        { id: 'msg-4', role: 'assistant', content: '[TEXTE]Le soleil revint.[/TEXTE]', timestamp: 4 },
      ],
      summaries: [],
      activeCutoffId: null,
    })

    render(
      <HistoryView
        storyId="test-story"
        onOpenResetConfirm={vi.fn()}
        onSummarize={vi.fn()}
        isSummarizeDisabled={false}
        onEditHistoryPrompt={onEditHistoryPrompt}
      />,
    )

    const prompts = await screen.findAllByTestId('history-prompt-item')
    expect(prompts).toHaveLength(2)

    // Edit the *first* prompt, not the last one.
    await user.click(within(prompts[0]).getByTestId('history-prompt-edit-button'))
    const textarea = within(prompts[0]).getByTestId('history-prompt-edit-textarea')
    expect(textarea).toHaveValue('Raconte une histoire.')
    await user.clear(textarea)
    await user.type(textarea, 'Raconte une autre histoire.')
    await user.click(within(prompts[0]).getByTestId('history-prompt-save-button'))

    expect(onEditHistoryPrompt).toHaveBeenCalledWith('msg-1', 'Raconte une autre histoire.')
  })

  it('cancelling a prompt edit discards the draft and keeps the original content', async () => {
    const user = userEvent.setup()
    const onEditHistoryPrompt = vi.fn()
    mockedFetchHistory.mockResolvedValue({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Prompt 1', timestamp: 1 },
        { id: 'msg-2', role: 'assistant', content: '[TEXTE]Passage 1.[/TEXTE]', timestamp: 2 },
      ],
      summaries: [],
      activeCutoffId: null,
    })

    render(
      <HistoryView
        storyId="test-story"
        onOpenResetConfirm={vi.fn()}
        onSummarize={vi.fn()}
        isSummarizeDisabled={false}
        onEditHistoryPrompt={onEditHistoryPrompt}
      />,
    )

    await screen.findByTestId('history-prompt-item')
    await user.click(screen.getByTestId('history-prompt-edit-button'))

    const textarea = screen.getByTestId('history-prompt-edit-textarea')
    await user.clear(textarea)
    await user.type(textarea, 'Brouillon abandonné.')

    await user.click(screen.getByTestId('history-prompt-cancel-button'))

    expect(onEditHistoryPrompt).not.toHaveBeenCalled()
    expect(screen.getByTestId('history-prompt-item')).toHaveTextContent('Prompt 1')
    expect(screen.queryByTestId('history-prompt-edit-textarea')).not.toBeInTheDocument()
  })
})
