import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntryHistoryDialog } from './EntryHistoryDialog'
import { fetchEntryVersions } from '@/lib/entryVersionsApi'

vi.mock('@/lib/entryVersionsApi', () => ({
  fetchEntryVersions: vi.fn(),
}))

const mockedFetch = vi.mocked(fetchEntryVersions)

const versions = [
  { id: 'v2', title: 'Idée révisée', content: 'Deuxième état\n\nParagraphe retrouvé', createdAt: 2_000_000 },
  { id: 'v1', title: 'Idée', content: 'Premier état', createdAt: 1_000_000 },
]

function renderDialog(onClose = vi.fn()) {
  render(<EntryHistoryDialog kind="note" storyId="s1" entryId="n1" onClose={onClose} />)
  return onClose
}

describe('EntryHistoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists the past versions, most recent first', async () => {
    mockedFetch.mockResolvedValue(versions)
    renderDialog()

    const items = await screen.findAllByTestId('entry-history-item')

    expect(mockedFetch).toHaveBeenCalledWith('note', 's1', 'n1')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Idée révisée')
    expect(items[1]).toHaveTextContent('Idée')
  })

  it('shows a version read-only and goes back to the list', async () => {
    const user = userEvent.setup()
    mockedFetch.mockResolvedValue(versions)
    renderDialog()

    await user.click((await screen.findAllByTestId('entry-history-item'))[0])

    const version = screen.getByTestId('entry-history-version')
    expect(version).toHaveTextContent('Idée révisée')
    expect(version).toHaveTextContent('Paragraphe retrouvé')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('entry-history-back'))

    expect(screen.getAllByTestId('entry-history-item')).toHaveLength(2)
  })

  it('says so when the entry has no earlier version', async () => {
    mockedFetch.mockResolvedValue([])
    renderDialog()

    expect(await screen.findByTestId('entry-history-empty')).toBeInTheDocument()
  })

  it('shows an error when loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedFetch.mockRejectedValue(new Error('boom'))
    renderDialog()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('closes with the close button and with Escape from the list', async () => {
    const user = userEvent.setup()
    mockedFetch.mockResolvedValue(versions)
    const onClose = renderDialog()
    await screen.findAllByTestId('entry-history-item')

    await user.click(screen.getByTestId('entry-history-close'))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2))
  })

  it('Escape steps back from a version to the list before closing', async () => {
    const user = userEvent.setup()
    mockedFetch.mockResolvedValue(versions)
    const onClose = renderDialog()

    await user.click((await screen.findAllByTestId('entry-history-item'))[0])
    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getAllByTestId('entry-history-item')).toHaveLength(2)
  })
})
