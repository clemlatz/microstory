'use client'

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translations, type Locale, type TranslationKey } from './translations'

const STORAGE_KEY = 'microstory_locale'

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as string[]).includes(value)
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match))
}

/**
 * Tiny external store wrapping `localStorage`'s locale entry, read through
 * `useSyncExternalStore` rather than an effect + `setState` (which the
 * `react-hooks/set-state-in-effect` lint rule flags, and which would also
 * cause an extra render on mount) — `useSyncExternalStore` already has the
 * exact hydration behavior this needs built in: it renders
 * `getServerSnapshot`'s value (always the English default, matching the
 * server-rendered markup) through the first client render, then reconciles
 * to `getSnapshot`'s real value — the viewer's own previous choice — right
 * after. `setStoredLocale` below is the only writer, and notifies every
 * subscribed component synchronously so a change made from one place (the
 * `LanguageSwitcher`) is reflected everywhere immediately, in the same tab.
 */
let listeners: Array<() => void> = []

function subscribe(listener: () => void) {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function getSnapshot(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isSupportedLocale(stored)) return stored
  } catch {
    // Storage can throw (private browsing, blocked site data) — default
    // locale is a perfectly fine fallback.
  }
  return DEFAULT_LOCALE
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE
}

function setStoredLocale(next: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Non-fatal: the choice just won't survive a reload in this browser.
  }
  for (const listener of listeners) listener()
}

/**
 * App-wide language preference (issue #86): English by default, with French
 * available as an explicit user choice. There is no server-side locale
 * negotiation — the app always renders in English on first paint (see
 * `getServerSnapshot` above), then reconciles to the viewer's own previous
 * choice from `localStorage` (per-browser, not synced across devices, same
 * tradeoff as every other per-viewer preference in this app) right after
 * hydration. This deliberately never touches narrative content (the writer
 * prompt, characters, notes, or anything sent to/from the LLM) — only the
 * interface chrome around it, via `translations.ts`.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setLocale = useCallback((next: Locale) => setStoredLocale(next), [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      interpolate(translations[locale][key], vars),
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/**
 * Reads the current locale/translator. Falls back to the default locale's
 * translations (rather than throwing) when rendered outside a
 * `LocaleProvider` — e.g. a component under test in isolation — so tests
 * that don't wrap in the provider keep working with English text.
 */
// Stable module-level object (not recreated per render/call) so a consumer
// rendered outside a `LocaleProvider` gets the same `t`/`setLocale`
// reference on every render — important because several components memoize
// callbacks (`useCallback`) or effects (`useEffect`) on `t`, and a fresh
// fallback object each call would otherwise churn those dependencies and
// re-run effects on every render.
const FALLBACK_LOCALE_CONTEXT_VALUE: LocaleContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, vars) => interpolate(translations[DEFAULT_LOCALE][key], vars),
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext)
  return context ?? FALLBACK_LOCALE_CONTEXT_VALUE
}
