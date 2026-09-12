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
export function LogoutButton() {
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
      aria-label={t('logout.ariaLabel')}
      title={t('logout.ariaLabel')}
      disabled={isLoggingOut}
      onClick={handleLogout}
      className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 disabled:opacity-50 dark:text-stone-500 dark:hover:bg-stone-900"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.5 17.5 21 12l-5.5-5.5M21 12H9M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6"
        />
      </svg>
    </button>
  )
}
