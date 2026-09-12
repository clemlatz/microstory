'use client'

import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Locale } from '@/lib/i18n/translations'

/**
 * The one control that lets a user switch away from the default English UI
 * to French (issue #86). Rendered once, fixed to a corner of the viewport
 * by `app/layout.tsx`, so it's reachable from every screen — including
 * `LoginView`, which has no header/config panel of its own to host it in.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()

  return (
    <select
      data-testid="language-switcher"
      aria-label={t('language.label')}
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
      className="fixed top-3 right-3 z-[60] rounded-lg border border-stone-300 bg-white/90 px-2 py-1 text-xs text-stone-600 shadow-sm backdrop-blur-sm hover:bg-white dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:bg-stone-900"
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
    </select>
  )
}
