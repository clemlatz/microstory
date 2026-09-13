'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { startRegistration, startAuthentication, WebAuthnError } from '@simplewebauthn/browser'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { TranslationKey } from '@/lib/i18n/translations'

type Status = 'checking' | 'register' | 'login'

async function postJson(url: string, body: unknown | undefined, genericErrorMessage: string): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? String(data.error) : genericErrorMessage
    throw new Error(message)
  }
  return data
}

function webAuthnErrorMessage(error: unknown, t: (key: TranslationKey) => string): string {
  if (error instanceof WebAuthnError) {
    if (error.code === 'ERROR_CEREMONY_ABORTED') return t('login.ceremonyAborted')
    return error.message
  }
  return error instanceof Error ? error.message : t('login.genericError')
}

/**
 * The passkey login/registration screen (issue #73). Replaces the old
 * passphrase-based EncryptionGate: no key is derived here, this is purely
 * an access gate — `proxy.ts` redirects any unauthenticated request here.
 */
const isDev = process.env.NODE_ENV === 'development'

export function LoginView() {
  const router = useRouter()
  const { t } = useLocale()
  const [status, setStatus] = useState<Status>('checking')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isDev) return
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data: { hasPasskey: boolean }) => setStatus(data.hasPasskey ? 'login' : 'register'))
      .catch(() => setError(t('login.statusCheckError')))
  }, [t])

  async function handleDevLogin() {
    setIsBusy(true)
    setError(null)
    try {
      await postJson('/api/auth/dev-login', undefined, t('login.genericError'))
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.genericError'))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRegister() {
    setIsBusy(true)
    setError(null)
    try {
      const optionsJSON = await postJson('/api/auth/register/options', undefined, t('login.genericError'))
      const attResp = await startRegistration({ optionsJSON: optionsJSON as never })
      await postJson('/api/auth/register/verify', attResp, t('login.genericError'))
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(webAuthnErrorMessage(err, t))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleLogin() {
    setIsBusy(true)
    setError(null)
    try {
      const optionsJSON = await postJson('/api/auth/login/options', undefined, t('login.genericError'))
      const authResp = await startAuthentication({ optionsJSON: optionsJSON as never })
      await postJson('/api/auth/login/verify', authResp, t('login.genericError'))
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(webAuthnErrorMessage(err, t))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#fdfbf6] px-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="w-full max-w-sm text-center">
        <img src="/logo-lotus.png" alt="" className="mx-auto mb-6 h-10 w-auto opacity-90" />
        <h1 className="mb-2 font-serif text-2xl">Microstory</h1>

        {isDev ? (
          <button
            data-testid="dev-login-button"
            type="button"
            disabled={isBusy}
            onClick={handleDevLogin}
            className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-sans text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            {isBusy ? t('login.devLoggingIn') : t('login.devButton')}
          </button>
        ) : status === 'checking' ? (
          <p className="font-sans text-sm text-stone-400 italic dark:text-stone-500">{t('common.loading')}</p>
        ) : status === 'register' ? (
          <>
            <p className="mb-6 font-sans text-sm text-stone-500 dark:text-stone-400">
              {t('login.registerIntro')}
            </p>
            <button
              data-testid="register-passkey-button"
              type="button"
              disabled={isBusy}
              onClick={handleRegister}
              className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-sans text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              {isBusy ? t('login.registering') : t('login.registerButton')}
            </button>
          </>
        ) : (
          <>
            <p className="mb-6 font-sans text-sm text-stone-500 dark:text-stone-400">
              {t('login.loginIntro')}
            </p>
            <button
              data-testid="login-passkey-button"
              type="button"
              disabled={isBusy}
              onClick={handleLogin}
              className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-sans text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              {isBusy ? t('login.authenticating') : t('login.loginButton')}
            </button>
          </>
        )}

        {error ? (
          <p
            role="alert"
            data-testid="login-error"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
