import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WriterPromptPanel } from './WriterPromptPanel'

vi.mock('@/lib/writerPromptApi', () => ({
  fetchWriterPrompt: vi.fn(),
  updateWriterPrompt: vi.fn(),
}))

vi.mock('@/lib/storyWordLimitApi', () => ({
  fetchMaxStoryWords: vi.fn(),
  updateMaxStoryWords: vi.fn(),
}))

vi.mock('@/lib/verbatimWindowApi', () => ({
  fetchVerbatimWindowWords: vi.fn(),
  updateVerbatimWindowWords: vi.fn(),
}))

vi.mock('@/lib/autoSummaryThresholdApi', () => ({
  fetchAutoSummaryThresholdWords: vi.fn(),
  updateAutoSummaryThresholdWords: vi.fn(),
}))

import { fetchWriterPrompt, updateWriterPrompt } from '@/lib/writerPromptApi'
import { fetchMaxStoryWords, updateMaxStoryWords } from '@/lib/storyWordLimitApi'
import { fetchVerbatimWindowWords, updateVerbatimWindowWords } from '@/lib/verbatimWindowApi'
import { fetchAutoSummaryThresholdWords, updateAutoSummaryThresholdWords } from '@/lib/autoSummaryThresholdApi'

const mockedFetchWriterPrompt = vi.mocked(fetchWriterPrompt)
const mockedUpdateWriterPrompt = vi.mocked(updateWriterPrompt)
const mockedFetchMaxStoryWords = vi.mocked(fetchMaxStoryWords)
const mockedUpdateMaxStoryWords = vi.mocked(updateMaxStoryWords)
const mockedFetchVerbatimWindowWords = vi.mocked(fetchVerbatimWindowWords)
const mockedUpdateVerbatimWindowWords = vi.mocked(updateVerbatimWindowWords)
const mockedFetchAutoSummaryThresholdWords = vi.mocked(fetchAutoSummaryThresholdWords)
const mockedUpdateAutoSummaryThresholdWords = vi.mocked(updateAutoSummaryThresholdWords)

describe('WriterPromptPanel', () => {
  beforeEach(() => {
    mockedFetchWriterPrompt.mockReset()
    mockedUpdateWriterPrompt.mockReset()
    mockedFetchMaxStoryWords.mockReset()
    mockedUpdateMaxStoryWords.mockReset()
    mockedFetchVerbatimWindowWords.mockReset()
    mockedUpdateVerbatimWindowWords.mockReset()
    mockedFetchAutoSummaryThresholdWords.mockReset()
    mockedUpdateAutoSummaryThresholdWords.mockReset()
    mockedFetchWriterPrompt.mockResolvedValue('')
    mockedFetchMaxStoryWords.mockResolvedValue(100)
    mockedFetchVerbatimWindowWords.mockResolvedValue(2500)
    mockedFetchAutoSummaryThresholdWords.mockResolvedValue(5000)
  })

  it('loads and displays the existing writer prompt on mount', async () => {
    mockedFetchWriterPrompt.mockResolvedValue('Tu es un auteur de roman policier.')
    render(<WriterPromptPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByTestId('writer-prompt-input')).toHaveValue(
        'Tu es un auteur de roman policier.',
      )
    })
  })

  it('saves an updated prompt through the form', async () => {
    mockedUpdateWriterPrompt.mockResolvedValue('Tu es un poète romantique.')
    const user = userEvent.setup()

    render(<WriterPromptPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchWriterPrompt).toHaveBeenCalled())

    await user.type(screen.getByTestId('writer-prompt-input'), 'Tu es un poète romantique.')
    await user.click(screen.getByTestId('writer-prompt-save-button'))

    await waitFor(() => {
      expect(mockedUpdateWriterPrompt).toHaveBeenCalledWith('test-story', 'Tu es un poète romantique.')
    })
    expect(await screen.findByText('Prompt saved.')).toBeInTheDocument()
  })

  it('shows an error message when saving fails', async () => {
    mockedUpdateWriterPrompt.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()

    render(<WriterPromptPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchWriterPrompt).toHaveBeenCalled())

    await user.click(screen.getByTestId('writer-prompt-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })

  it('loads and displays the story word limit on mount, defaulting to 100', async () => {
    render(<WriterPromptPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByTestId('story-word-limit-input')).toHaveValue(100)
    })
  })

  it('displays a previously saved story word limit on mount', async () => {
    mockedFetchMaxStoryWords.mockResolvedValue(250)
    render(<WriterPromptPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByTestId('story-word-limit-input')).toHaveValue(250)
    })
  })

  it('saves an updated story word limit through the form', async () => {
    mockedUpdateMaxStoryWords.mockResolvedValue(50)
    const user = userEvent.setup()

    render(<WriterPromptPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchMaxStoryWords).toHaveBeenCalled())

    const input = screen.getByTestId('story-word-limit-input')
    await user.clear(input)
    await user.type(input, '50')
    await user.click(screen.getByTestId('story-word-limit-save-button'))

    await waitFor(() => {
      expect(mockedUpdateMaxStoryWords).toHaveBeenCalledWith(50)
    })
    expect(await screen.findByText('Limit saved.')).toBeInTheDocument()
  })

  it('shows an error message when saving the story word limit fails', async () => {
    mockedUpdateMaxStoryWords.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()

    render(<WriterPromptPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchMaxStoryWords).toHaveBeenCalled())

    await user.click(screen.getByTestId('story-word-limit-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })

  it('loads and displays the verbatim window words on mount, defaulting to 2500', async () => {
    render(<WriterPromptPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByTestId('verbatim-window-input')).toHaveValue(2500)
    })
  })

  it('displays a previously saved verbatim window words value on mount', async () => {
    mockedFetchVerbatimWindowWords.mockResolvedValue(1800)
    render(<WriterPromptPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByTestId('verbatim-window-input')).toHaveValue(1800)
    })
  })

  it('saves an updated verbatim window words value through the form', async () => {
    mockedUpdateVerbatimWindowWords.mockResolvedValue(1800)
    const user = userEvent.setup()

    render(<WriterPromptPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchVerbatimWindowWords).toHaveBeenCalled())

    const input = screen.getByTestId('verbatim-window-input')
    await user.clear(input)
    await user.type(input, '1800')
    await user.click(screen.getByTestId('verbatim-window-save-button'))

    await waitFor(() => {
      expect(mockedUpdateVerbatimWindowWords).toHaveBeenCalledWith(1800)
    })
    expect(await screen.findByText('Window saved.')).toBeInTheDocument()
  })

  it('shows an error message when saving the verbatim window words fails', async () => {
    mockedUpdateVerbatimWindowWords.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()

    render(<WriterPromptPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchVerbatimWindowWords).toHaveBeenCalled())

    await user.click(screen.getByTestId('verbatim-window-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })

  it('loads and displays the auto-summary threshold words on mount, defaulting to 5000', async () => {
    render(<WriterPromptPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByTestId('auto-summary-threshold-input')).toHaveValue(5000)
    })
  })

  it('displays a previously saved auto-summary threshold words value on mount', async () => {
    mockedFetchAutoSummaryThresholdWords.mockResolvedValue(3000)
    render(<WriterPromptPanel storyId="test-story" />)

    await waitFor(() => {
      expect(screen.getByTestId('auto-summary-threshold-input')).toHaveValue(3000)
    })
  })

  it('saves an updated auto-summary threshold words value through the form', async () => {
    mockedUpdateAutoSummaryThresholdWords.mockResolvedValue(3000)
    const user = userEvent.setup()

    render(<WriterPromptPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchAutoSummaryThresholdWords).toHaveBeenCalled())

    const input = screen.getByTestId('auto-summary-threshold-input')
    await user.clear(input)
    await user.type(input, '3000')
    await user.click(screen.getByTestId('auto-summary-threshold-save-button'))

    await waitFor(() => {
      expect(mockedUpdateAutoSummaryThresholdWords).toHaveBeenCalledWith(3000)
    })
    expect(await screen.findByText('Threshold saved.')).toBeInTheDocument()
  })

  it('shows an error message when saving the auto-summary threshold words fails', async () => {
    mockedUpdateAutoSummaryThresholdWords.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()

    render(<WriterPromptPanel storyId="test-story" />)
    await waitFor(() => expect(mockedFetchAutoSummaryThresholdWords).toHaveBeenCalled())

    await user.click(screen.getByTestId('auto-summary-threshold-save-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})
