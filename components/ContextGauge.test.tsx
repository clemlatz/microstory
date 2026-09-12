import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContextGauge } from './ContextGauge'

describe('ContextGauge', () => {
  it('fills the bar proportionally to pending/threshold words', () => {
    render(<ContextGauge pendingWords={1250} thresholdWords={5000} />)

    expect(screen.getByTestId('context-gauge-fill')).toHaveStyle({ width: '25%' })
  })

  it('caps the fill at 100% when pending words exceed the threshold', () => {
    render(<ContextGauge pendingWords={6000} thresholdWords={5000} />)

    expect(screen.getByTestId('context-gauge-fill')).toHaveStyle({ width: '100%' })
  })

  it('shows the green risk color below 50% of the threshold', () => {
    render(<ContextGauge pendingWords={100} thresholdWords={5000} />)

    expect(screen.getByTestId('context-gauge-fill')).toHaveClass('bg-emerald-500')
  })

  it('shows the amber risk color between 50% and 80% of the threshold', () => {
    render(<ContextGauge pendingWords={3000} thresholdWords={5000} />)

    expect(screen.getByTestId('context-gauge-fill')).toHaveClass('bg-amber-500')
  })

  it('shows the red risk color above 80% of the threshold', () => {
    render(<ContextGauge pendingWords={4500} thresholdWords={5000} />)

    expect(screen.getByTestId('context-gauge-fill')).toHaveClass('bg-red-500')
  })

  it('shows the exact word counts in the title tooltip', () => {
    render(<ContextGauge pendingWords={2150} thresholdWords={5000} />)

    expect(screen.getByTestId('context-gauge')).toHaveAttribute(
      'title',
      '2150 / 5000 words before automatic summary',
    )
  })
})
