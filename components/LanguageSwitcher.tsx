'use client'

import { useLocale } from '@/lib/i18n/LocaleContext'
import type { Locale } from '@/lib/i18n/translations'

/**
 * The one control that lets a user switch away from the default English UI
 * to French (issue #86). Originally fixed to a corner of the viewport by
 * `app/layout.tsx` so it was reachable from every screen; now hosted at the
 * bottom of `StoryNavDrawer` instead (issue #13's navigation drawer), so it
 * takes that container's own layout rather than positioning itself.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale()

  return (
    <select
      data-testid="language-switcher"
      aria-label={t('language.label')}
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
      className={
        className ??
        'min-h-11 rounded-lg border border-stone-300 bg-white/90 px-2 text-xs text-stone-600 shadow-sm hover:bg-white dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:bg-stone-900'
      }
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
    </select>
  )
}
