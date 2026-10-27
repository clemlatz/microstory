'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useLocale } from '@/lib/i18n/LocaleContext'

/**
 * Explicit sign-out control (issue #73's clarification: a logout button is
 * required even though the session cookie is otherwise long-lived/never
 * expires on its own). Clears the server-side session row and its cookie,
 * then sends the browser back to the passkey login screen.
 */
export function LogoutButton({
  className = 'rounded-lg p-3 text-[var(--reader-muted)] hover:bg-[var(--reader-input-bg)] disabled:opacity-50',
  showLabel = false,
}: {
  className?: string
  /** Renders the text next to the icon (the icon-only default is labelled via `aria-label`). */
  showLabel?: boolean
} = {}) {
  const router = useRouter()
  const { t } = useLocale()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Failed to log out', error)
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <button
      data-testid="logout-button"
      type="button"
      aria-label={showLabel ? undefined : t('logout.ariaLabel')}
      title={showLabel ? undefined : t('logout.ariaLabel')}
      disabled={isLoggingOut}
      onClick={handleLogout}
      className={className}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className={showLabel ? 'h-4 w-4 shrink-0' : 'h-5 w-5'}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.5 17.5 21 12l-5.5-5.5M21 12H9M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6"
        />
      </svg>
      {showLabel && t('logout.ariaLabel')}
    </button>
  )
}
