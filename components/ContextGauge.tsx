import { useLocale } from '@/lib/i18n/LocaleContext'

type ContextGaugeProps = {
  pendingWords: number
  thresholdWords: number
}

function riskColorClass(percentage: number): string {
  if (percentage >= 80) return 'bg-red-500'
  if (percentage >= 50) return 'bg-amber-500'
  return 'bg-emerald-500'
}

/**
 * A small header indicator of how close the conversation is to triggering
 * the next automatic summary (see lib/autoSummaryTrigger.ts): the fill
 * tracks `pendingWords` (the word count of everything since the last
 * summary's cutoff, outside the verbatim window) against
 * `thresholdWords` (settings.autoSummaryThresholdWords) — the same
 * comparison `maybeAutoSummarize` itself makes to decide whether to fold
 * content into the rolling summary. Unlike the raw model-context-window
 * fullness this used to show, this is always known (no dependency on the
 * LLM server exposing its context window), so the header no longer needs
 * to hide the gauge when that's unavailable.
 */
export function ContextGauge({ pendingWords, thresholdWords }: ContextGaugeProps) {
  const { t } = useLocale()
  const percentage = Math.min(100, (pendingWords / thresholdWords) * 100)

  return (
    <div
      data-testid="context-gauge"
      title={t('contextGauge.tooltip', { pending: pendingWords, threshold: thresholdWords })}
      className="flex items-center gap-1.5"
    >
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div
          data-testid="context-gauge-fill"
          className={`h-full rounded-full transition-[width] ${riskColorClass(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
