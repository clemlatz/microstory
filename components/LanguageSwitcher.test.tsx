import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocaleProvider } from '@/lib/i18n/LocaleContext'
import { LanguageSwitcher } from './LanguageSwitcher'

/**
 * Covers issue #86's own acceptance criteria: English by default, with an
 * explicit way to switch to French that survives a reload (via
 * `localStorage`, read back by a fresh `LocaleProvider` on next mount).
 */
describe('LanguageSwitcher', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to English', () => {
    render(
      <LocaleProvider>
        <LanguageSwitcher />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('language-switcher')).toHaveValue('en')
  })

  it('switches to French and persists the choice for the next mount', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <LocaleProvider>
        <LanguageSwitcher />
      </LocaleProvider>,
    )

    await user.selectOptions(screen.getByTestId('language-switcher'), 'fr')
    expect(screen.getByTestId('language-switcher')).toHaveValue('fr')

    unmount()

    render(
      <LocaleProvider>
        <LanguageSwitcher />
      </LocaleProvider>,
    )
    expect(screen.getByTestId('language-switcher')).toHaveValue('fr')
  })
})
