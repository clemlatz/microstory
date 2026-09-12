import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { LlmStatusPanel } from './LlmStatusPanel'
import { DEFAULT_REPETITION_PENALTY } from '@/lib/repetitionPenaltyDefaults'

vi.mock('@/lib/contextUsageApi', () => ({
  fetchContextUsage: vi.fn(),
}))

vi.mock('@/lib/repetitionPenaltyApi', () => ({
  fetchRepetitionPenalty: vi.fn(),
  updateRepetitionPenalty: vi.fn(),
}))

import { fetchContextUsage } from '@/lib/contextUsageApi'
import { fetchRepetitionPenalty, updateRepetitionPenalty } from '@/lib/repetitionPenaltyApi'

const mockedFetchContextUsage = vi.mocked(fetchContextUsage)
const mockedFetchRepetitionPenalty = vi.mocked(fetchRepetitionPenalty)
const mockedUpdateRepetitionPenalty = vi.mocked(updateRepetitionPenalty)

describe('LlmStatusPanel', () => {
  beforeEach(() => {
    mockedFetchContextUsage.mockReset()
    mockedFetchRepetitionPenalty.mockReset()
    mockedUpdateRepetitionPenalty.mockReset()
    mockedFetchRepetitionPenalty.mockResolvedValue(DEFAULT_REPETITION_PENALTY)
    mockedUpdateRepetitionPenalty.mockResolvedValue(DEFAULT_REPETITION_PENALTY)
  })

  it('shows the configured model name and a loaded status', async () => {
    mockedFetchContextUsage.mockResolvedValue({
      usedTokens: 100,
      maxTokens: 32768,
      pendingWords: 0,
      autoSummaryThresholdWords: 5000,
      modelName: 'local-model',
      modelLoaded: true,
      modelIsLoading: false,
    })

    render(<LlmStatusPanel storyId="test-story" />)

    await waitFor(() => expect(screen.getByTestId('llm-model-name')).toHaveTextContent('local-model'))
    expect(screen.getByTestId('llm-model-status')).toHaveTextContent('Loaded')
    expect(screen.getByTestId('llm-model-status')).toHaveAttribute('data-status', 'loaded')
  })

  it('shows a loading status while the model is being loaded', async () => {
    mockedFetchContextUsage.mockResolvedValue({
      usedTokens: 0,
      maxTokens: 32768,
      pendingWords: 0,
      autoSummaryThresholdWords: 5000,
      modelName: 'local-model',
      modelLoaded: false,
      modelIsLoading: true,
    })

    render(<LlmStatusPanel storyId="test-story" />)

    await waitFor(() =>
      expect(screen.getByTestId('llm-model-status')).toHaveAttribute('data-status', 'loading'),
    )
    expect(screen.getByTestId('llm-model-status')).toHaveTextContent('Loading')
  })

  it('shows an unavailable status when the model is absent from the server response', async () => {
    mockedFetchContextUsage.mockResolvedValue({
      usedTokens: 0,
      maxTokens: 32768,
      pendingWords: 0,
      autoSummaryThresholdWords: 5000,
      modelName: 'missing-model',
      modelLoaded: null,
      modelIsLoading: null,
    })

    render(<LlmStatusPanel storyId="test-story" />)

    await waitFor(() =>
      expect(screen.getByTestId('llm-model-status')).toHaveAttribute('data-status', 'unavailable'),
    )
    expect(screen.getByTestId('llm-model-status')).toHaveTextContent('Unavailable')
  })

  it('shows an unavailable status and an error message when the request fails', async () => {
    mockedFetchContextUsage.mockRejectedValue(new Error('connect ECONNREFUSED'))

    render(<LlmStatusPanel storyId="test-story" />)

    await waitFor(() =>
      expect(screen.getByTestId('llm-model-status')).toHaveAttribute('data-status', 'unavailable'),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('connect ECONNREFUSED')
  })

  // Fake timers are used here (rather than globally, see the note in
  // ChatWindow.test.tsx about React's scheduler deadlocking userEvent under
  // globally faked timers) with explicit act()-wrapped advances instead of
  // testing-library's waitFor, since waitFor's own polling relies on a real
  // setTimeout that fake timers would never fire on its own.
  it('polls for the model status every second while mounted', async () => {
    vi.useFakeTimers()
    try {
      mockedFetchContextUsage.mockResolvedValue({
        usedTokens: 0,
        maxTokens: 32768,
        pendingWords: 0,
        autoSummaryThresholdWords: 5000,
        modelName: 'local-model',
        modelLoaded: true,
        modelIsLoading: false,
      })

      render(<LlmStatusPanel storyId="test-story" />)

      await act(async () => {
        await Promise.resolve()
      })
      expect(mockedFetchContextUsage).toHaveBeenCalledTimes(1)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      expect(mockedFetchContextUsage).toHaveBeenCalledTimes(2)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      expect(mockedFetchContextUsage).toHaveBeenCalledTimes(3)
    } finally {
      vi.useRealTimers()
    }
  })
})
