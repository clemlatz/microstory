import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentationEditPage } from './DocumentationEditPage'
import type { DocumentationEntry, Story } from '@/lib/types'

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/lib/documentationApi', () => ({
  updateDocumentationEntry: vi.fn(),
}))

import { updateDocumentationEntry } from '@/lib/documentationApi'

const mockedUpdate = vi.mocked(updateDocumentationEntry)

// Same stubbing rationale as NoteEditPage.test.tsx: the real BlockNote
// editor is covered by DocumentationContentEditor's own tests, and real
// timers are used throughout since globally faked timers deadlock
// userEvent interactions that trigger a render.
vi.mock('./DocumentationContentEditor', () => ({
  DocumentationContentEditor: ({
    initialMarkdown,
    onChangeMarkdown,
  }: {
    initialMarkdown: string
    onChangeMarkdown: (markdown: string) => void
  }) => (
    <textarea
      data-testid="documentation-content-editor-stub"
      defaultValue={initialMarkdown}
      onChange={(event) => onChangeMarkdown(event.target.value)}
    />
  ),
}))

const source: DocumentationEntry = {
  id: '1',
  title: 'Gravité lunaire',
  content: 'Un sixième de la gravité terrestre',
  url: 'https://example.com/gravite',
  createdAt: 1000,
  updatedAt: 1000,
}

const story: Story = {
  id: 'story-1',
  title: 'Le Voyage de Nour',
  presentation: '',
  createdAt: 1000,
  updatedAt: 2000,
  lastPassagePreview: null,
}

const WAIT_FOR_AUTOSAVE = { timeout: 2000 }

describe('DocumentationEditPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockRouterPush.mockReset()
    mockedUpdate.mockReset()
    mockedUpdate.mockResolvedValue(source)
  })

  it('shows the entry title, url and content, with no save button', async () => {
    render(<DocumentationEditPage story={story} entry={source} llmWritingEnabled={true} />)

    expect(screen.getByTestId('story-title')).toHaveValue('Gravité lunaire')
    expect(screen.getByTestId('documentation-page-url-input')).toHaveValue('https://example.com/gravite')
    expect(await screen.findByTestId('documentation-content-editor-stub')).toHaveValue(
      'Un sixième de la gravité terrestre',
    )
    expect(screen.queryByTestId('documentation-page-save-button')).not.toBeInTheDocument()
  })

  it('shows the entry title in the title bar instead of the story title', async () => {
    render(<DocumentationEditPage story={story} entry={source} llmWritingEnabled={true} />)

    expect(screen.getByTestId('story-title')).toHaveValue('Gravité lunaire')
  })

  it('renders an empty url field when the entry has none', async () => {
    render(<DocumentationEditPage story={story} entry={{ ...source, url: null }} llmWritingEnabled={true} />)

    expect(screen.getByTestId('documentation-page-url-input')).toHaveValue('')
  })

  it('autosaves a title change after the debounce delay', async () => {
    const user = userEvent.setup()
    render(<DocumentationEditPage story={story} entry={source} llmWritingEnabled={true} />)

    await user.clear(screen.getByTestId('story-title'))
    await user.type(screen.getByTestId('story-title'), 'Gravité révisée')
    expect(mockedUpdate).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('story-1', '1', {
        title: 'Gravité révisée',
        content: 'Un sixième de la gravité terrestre',
        url: 'https://example.com/gravite',
      })
    }, WAIT_FOR_AUTOSAVE)
    expect(mockedUpdate).toHaveBeenCalledTimes(1)
  })

  it('autosaves a url change after the debounce delay', async () => {
    const user = userEvent.setup()
    render(<DocumentationEditPage story={story} entry={source} llmWritingEnabled={true} />)

    await user.clear(screen.getByTestId('documentation-page-url-input'))
    await user.type(screen.getByTestId('documentation-page-url-input'), 'https://example.com/other')

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('story-1', '1', {
        title: 'Gravité lunaire',
        content: 'Un sixième de la gravité terrestre',
        url: 'https://example.com/other',
      })
    }, WAIT_FOR_AUTOSAVE)
  })

  it('autosaves a content change after the debounce delay', async () => {
    const user = userEvent.setup()
    render(<DocumentationEditPage story={story} entry={source} llmWritingEnabled={true} />)

    await user.clear(await screen.findByTestId('documentation-content-editor-stub'))
    await user.type(screen.getByTestId('documentation-content-editor-stub'), 'Un dixième de la gravité')

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('story-1', '1', {
        title: 'Gravité lunaire',
        content: 'Un dixième de la gravité',
        url: 'https://example.com/gravite',
      })
    }, WAIT_FOR_AUTOSAVE)
  })

  it('flushes a pending save immediately when navigating back via the drawer', async () => {
    const user = userEvent.setup()
    render(<DocumentationEditPage story={story} entry={source} llmWritingEnabled={true} />)

    await user.type(screen.getByTestId('story-title'), ' révisée')
    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-my-stories'))

    expect(mockedUpdate).toHaveBeenCalledWith('story-1', '1', {
      title: 'Gravité lunaire révisée',
      content: 'Un sixième de la gravité terrestre',
      url: 'https://example.com/gravite',
    })
    expect(mockRouterPush).toHaveBeenCalledWith('/stories')
  })

  it('navigates back without saving when nothing changed', async () => {
    const user = userEvent.setup()
    render(<DocumentationEditPage story={story} entry={source} llmWritingEnabled={true} />)

    await user.click(screen.getByTestId('story-nav-toggle'))
    await user.click(screen.getByTestId('story-nav-my-stories'))

    expect(mockRouterPush).toHaveBeenCalledWith('/stories')
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('does not autosave while the title is empty', async () => {
    const user = userEvent.setup()
    render(<DocumentationEditPage story={story} entry={source} llmWritingEnabled={true} />)

    await user.clear(screen.getByTestId('story-title'))
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('does not autosave while the content is empty', async () => {
    const user = userEvent.setup()
    render(<DocumentationEditPage story={story} entry={source} llmWritingEnabled={true} />)

    await user.clear(await screen.findByTestId('documentation-content-editor-stub'))
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('shows an error message when autosaving fails', async () => {
    mockedUpdate.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<DocumentationEditPage story={story} entry={source} llmWritingEnabled={true} />)

    await user.type(screen.getByTestId('story-title'), ' révisée')

    expect(await screen.findByRole('alert', {}, WAIT_FOR_AUTOSAVE)).toHaveTextContent('boom')
  })
})
