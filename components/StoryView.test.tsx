import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryView } from './StoryView'

describe('StoryView', () => {
  it('shows a placeholder when there are no passages yet', () => {
    render(<StoryView passages={[]} />)

    expect(screen.getByTestId('story-view-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('story-passage')).not.toBeInTheDocument()
  })

  it('renders only the last passage, hiding earlier ones', () => {
    render(<StoryView passages={['Premier passage.', 'Deuxième passage.']} />)

    expect(screen.queryByTestId('story-view-empty')).not.toBeInTheDocument()
    const passages = screen.getAllByTestId('story-passage')
    expect(passages).toHaveLength(1)
    expect(passages[0]).toHaveTextContent('Deuxième passage.')
    expect(screen.queryByText('Premier passage.')).not.toBeInTheDocument()
  })

  // The "writing" status line above the passage was moved into the
  // manuscript's floating input itself (issue #39 — see ChatWindow's
  // FloatingActivityBar); StoryView no longer renders one for `isGenerating`.
  it('never shows a generating indicator above the passage, regardless of isGenerating (issue #39)', () => {
    const { rerender } = render(
      <StoryView passages={['Premier passage.', 'Deuxième passage.']} isGenerating />,
    )
    expect(screen.queryByTestId('story-generating-indicator')).not.toBeInTheDocument()

    rerender(<StoryView passages={['Premier passage.']} isGenerating={false} />)
    expect(screen.queryByTestId('story-generating-indicator')).not.toBeInTheDocument()
  })

  // Reinstated below the last passage (in addition to the floating input's
  // own FloatingActivityBar label) so a summary in progress is visible from
  // the manuscript itself, not just the input area — while keeping the last
  // passage on screen underneath it rather than hiding it.
  it('shows a summarizing indicator below the last passage while isSummarizing, until the summary starts streaming in', () => {
    const { rerender } = render(<StoryView passages={['Premier passage.']} isSummarizing />)
    expect(screen.getByTestId('story-passage')).toHaveTextContent('Premier passage.')
    expect(screen.getByTestId('story-summarizing-indicator')).toHaveTextContent('Summarizing')

    rerender(<StoryView passages={['Premier passage.']} isSummarizing={false} />)
    expect(screen.queryByTestId('story-summarizing-indicator')).not.toBeInTheDocument()
  })

  it('hides the summarizing indicator once the summary itself starts streaming in', () => {
    render(<StoryView passages={['Premier passage.']} isSummarizing displayOverride="Un résumé en cours…" />)

    expect(screen.getByTestId('story-passage')).toHaveTextContent('Un résumé en cours…')
    expect(screen.queryByTestId('story-summarizing-indicator')).not.toBeInTheDocument()
  })

  it('renders displayOverride instead of the last passage when set, without touching earlier passages', () => {
    render(<StoryView passages={['Premier passage.', 'Deuxième passage.']} displayOverride="Résumé bref." />)

    const passages = screen.getAllByTestId('story-passage')
    expect(passages).toHaveLength(1)
    expect(passages[0]).toHaveTextContent('Résumé bref.')
    expect(screen.queryByText('Deuxième passage.')).not.toBeInTheDocument()
  })

  it('shows a "Résumé" label and distinct styling when displaying a summary', () => {
    render(<StoryView passages={['Premier passage.']} displayOverride="Résumé bref." />)

    expect(screen.getByTestId('story-summary-label')).toHaveTextContent('Summary')
    expect(screen.getByTestId('story-passage')).toHaveClass('font-sans')
    expect(screen.getByTestId('story-passage')).toHaveClass('italic')
    expect(screen.getByTestId('story-passage')).not.toHaveClass('font-serif')
  })

  it('does not show the "Résumé" label for a normal passage', () => {
    render(<StoryView passages={['Premier passage.']} />)

    expect(screen.queryByTestId('story-summary-label')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-passage')).toHaveClass('font-serif')
  })

  it('shows the summary as plain, non-editable text once it has finished generating (issue #44)', () => {
    render(<StoryView passages={['Premier passage.']} displayOverride="Résumé bref." />)

    expect(screen.getByTestId('story-passage').tagName).toBe('P')
    expect(screen.getByTestId('story-passage')).toHaveTextContent('Résumé bref.')
    expect(screen.queryByTestId('edit-summary-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('use-summary-as-context-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('summary-persisted-confirmation')).not.toBeInTheDocument()
  })

  it('does not show the edit-prompt control when canEditPrompt is false', () => {
    render(<StoryView passages={['Premier passage.']} canEditPrompt={false} onStartEditPrompt={vi.fn()} />)

    expect(screen.queryByTestId('edit-prompt-button')).not.toBeInTheDocument()
  })

  it('shows the current prompt above the last passage, with the edit-prompt control just below it, when canEditPrompt is true', () => {
    render(
      <StoryView
        passages={['Premier passage.']}
        canEditPrompt
        onStartEditPrompt={vi.fn()}
        currentPrompt="Le prompt en cours."
      />,
    )

    expect(screen.getByTestId('story-current-prompt')).toHaveTextContent('Le prompt en cours.')
    expect(screen.getByTestId('edit-prompt-button')).toBeInTheDocument()
  })

  it('calls onStartEditPrompt when the button is clicked, with no inline field of its own', async () => {
    const onStartEditPrompt = vi.fn()
    const user = userEvent.setup()
    render(
      <StoryView
        passages={['Premier passage.']}
        canEditPrompt
        onStartEditPrompt={onStartEditPrompt}
        currentPrompt="Le prompt en cours."
      />,
    )

    await user.click(screen.getByTestId('edit-prompt-button'))

    expect(onStartEditPrompt).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('edit-prompt-input')).not.toBeInTheDocument()
    expect(screen.queryByTestId('edit-prompt-submit-button')).not.toBeInTheDocument()
  })

  it('only ever targets the single last passage rendered, never an earlier one', () => {
    render(
      <StoryView
        passages={['Premier passage.', 'Deuxième passage.']}
        canEditPrompt
        onStartEditPrompt={vi.fn()}
        currentPrompt="Le prompt en cours."
      />,
    )

    expect(screen.getAllByTestId('edit-prompt-button')).toHaveLength(1)
  })

  // Issue #48: the previous last passage disappears immediately once a
  // prompt is sent, replaced by the sent prompt (above) and the new
  // passage's draft text growing underneath as it streams in.
  it('hides the previous last passage and shows the pending prompt as soon as pendingPrompt is set', () => {
    render(
      <StoryView
        passages={['Ancien passage.']}
        isGenerating
        pendingPrompt="Continue l'histoire avec un dragon."
        generationDraft=""
      />,
    )

    expect(screen.queryByText('Ancien passage.')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-pending-prompt')).toHaveTextContent("Continue l'histoire avec un dragon.")
    expect(screen.getByTestId('story-thinking-indicator')).toHaveTextContent('Thinking')
    expect(screen.queryByTestId('story-passage')).not.toBeInTheDocument()
  })

  it('grows the passage text under the pending prompt as generationDraft streams in', () => {
    const { rerender } = render(
      <StoryView
        passages={['Ancien passage.']}
        isGenerating
        pendingPrompt="Continue."
        generationDraft=""
      />,
    )
    expect(screen.getByTestId('story-thinking-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('story-thinking-indicator')).toHaveClass('animate-pulse')
    expect(screen.queryByTestId('story-passage')).not.toBeInTheDocument()

    rerender(
      <StoryView
        passages={['Ancien passage.']}
        isGenerating
        pendingPrompt="Continue."
        generationDraft="Le dragon apparut"
      />,
    )
    expect(screen.queryByTestId('story-thinking-indicator')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-passage')).toHaveTextContent('Le dragon apparut')
    expect(screen.getByTestId('story-pending-prompt')).toHaveTextContent('Continue.')
  })

  it('shows the pending prompt even when there is no previous passage at all', () => {
    render(<StoryView passages={[]} isGenerating pendingPrompt="Premier message." generationDraft="" />)

    expect(screen.queryByTestId('story-view-empty')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-pending-prompt')).toHaveTextContent('Premier message.')
  })

  it('reverts to the normal passage display once pendingPrompt is cleared', () => {
    const { rerender } = render(
      <StoryView
        passages={['Ancien passage.']}
        isGenerating
        pendingPrompt="Continue."
        generationDraft="Nouveau passage."
      />,
    )
    expect(screen.getByTestId('story-passage')).toHaveTextContent('Nouveau passage.')

    rerender(<StoryView passages={['Ancien passage.', 'Nouveau passage.']} pendingPrompt={null} />)

    expect(screen.queryByTestId('story-pending-prompt')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-passage')).toHaveTextContent('Nouveau passage.')
  })
})
