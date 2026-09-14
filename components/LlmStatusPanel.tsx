'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { fetchContextUsage, type ContextUsage } from '@/lib/contextUsageApi'
import { fetchRepetitionPenalty, updateRepetitionPenalty } from '@/lib/repetitionPenaltyApi'
import { useLocale } from '@/lib/i18n/LocaleContext'
import type { TranslationKey } from '@/lib/i18n/translations'
import {
  DEFAULT_REPETITION_PENALTY,
  MIN_REPETITION_PENALTY,
  MAX_REPETITION_PENALTY,
} from '@/lib/repetitionPenaltyDefaults'

const POLL_INTERVAL_MS = 1000

type LlmStatus = 'loaded' | 'loading' | 'unavailable'

function deriveStatus(usage: ContextUsage | null): LlmStatus {
  if (!usage) return 'unavailable'
  if (usage.modelIsLoading) return 'loading'
  if (usage.modelLoaded) return 'loaded'
  return 'unavailable'
}

const STATUS_LABEL_KEYS: Record<LlmStatus, TranslationKey> = {
  loaded: 'llmStatus.loaded',
  loading: 'llmStatus.loading',
  unavailable: 'llmStatus.unavailable',
}

const STATUS_DOT_CLASSES: Record<LlmStatus, string> = {
  loaded: 'bg-green-500',
  loading: 'bg-amber-500',
  unavailable: 'bg-red-500',
}

const STATUS_TEXT_CLASSES: Record<LlmStatus, string> = {
  loaded: 'text-green-600 dark:text-green-400',
  loading: 'text-amber-600 dark:text-amber-400',
  unavailable: 'text-red-600 dark:text-red-400',
}

/**
 * Content of the "LLM" section of the config panel: the configured model
 * name (LLM_MODEL_NAME) and its current load state, as reported by the LLM
 * server's /v1/models/status. Polls /api/context-usage every second while
 * mounted (i.e. while this tab is the active one — ConfigPanel only renders
 * the active section's content) so the status stays live.
 */
export function LlmStatusPanel({ storyId }: { storyId: string }) {
  const { t } = useLocale()

  const errorMessage = useCallback(
    (error: unknown): string => (error instanceof Error && error.message ? error.message : t('common.genericError')),
    [t],
  )

  const [usage, setUsage] = useState<ContextUsage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [repetitionPenalty, setRepetitionPenalty] = useState(DEFAULT_REPETITION_PENALTY)
  const [isPenaltyLoading, setIsPenaltyLoading] = useState(true)
  const [isPenaltySaving, setIsPenaltySaving] = useState(false)
  const [penaltyError, setPenaltyError] = useState<string | null>(null)
  const [penaltySavedMessage, setPenaltySavedMessage] = useState(false)

  useEffect(() => {
    fetchRepetitionPenalty()
      .then((loaded) => setRepetitionPenalty(loaded))
      .catch((err) => {
        console.error('Failed to load the repetition penalty', err)
        setPenaltyError(errorMessage(err))
      })
      .finally(() => setIsPenaltyLoading(false))
  }, [errorMessage])

  async function handlePenaltySubmit(event: FormEvent) {
    event.preventDefault()
    setIsPenaltySaving(true)
    setPenaltyError(null)
    setPenaltySavedMessage(false)
    try {
      const saved = await updateRepetitionPenalty(repetitionPenalty)
      setRepetitionPenalty(saved)
      setPenaltySavedMessage(true)
    } catch (err) {
      console.error('Failed to save the repetition penalty', err)
      setPenaltyError(errorMessage(err))
    } finally {
      setIsPenaltySaving(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const result = await fetchContextUsage(storyId)
        if (cancelled) return
        setUsage(result)
        setError(null)
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load the LLM model status', err)
        setUsage(null)
        setError(errorMessage(err))
      }
    }

    poll()
    const intervalId = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [storyId, errorMessage])

  const status = deriveStatus(usage)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">{t('llmStatus.modelTitle')}</h3>
        <p
          data-testid="llm-model-name"
          className="break-all text-sm text-gray-900 dark:text-gray-100"
        >
          {usage?.modelName ?? '—'}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">{t('llmStatus.statusTitle')}</h3>
        <div className="flex items-center gap-2" data-testid="llm-model-status" data-status={status}>
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASSES[status]}`} aria-hidden="true" />
          <span className={`text-sm font-medium ${STATUS_TEXT_CLASSES[status]}`}>
            {t(STATUS_LABEL_KEYS[status])}
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
          {t('llmStatus.repetitionTitle')}
        </h3>
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          {t('llmStatus.repetitionDescription', {
            min: MIN_REPETITION_PENALTY,
            max: MAX_REPETITION_PENALTY,
          })}
        </p>

        <form className="flex flex-col gap-2" onSubmit={handlePenaltySubmit}>
          <input
            type="number"
            min={MIN_REPETITION_PENALTY}
            max={MAX_REPETITION_PENALTY}
            step={0.1}
            data-testid="repetition-penalty-input"
            className="w-32 min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={repetitionPenalty}
            disabled={isPenaltyLoading}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value)
              setRepetitionPenalty(Number.isNaN(value) ? 0 : value)
              setPenaltySavedMessage(false)
            }}
          />
          {penaltyError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {penaltyError}
            </p>
          )}
          {penaltySavedMessage && !penaltyError && (
            <p className="text-sm text-green-600 dark:text-green-400">{t('llmStatus.repetitionSaved')}</p>
          )}
          <div>
            <button
              type="submit"
              data-testid="repetition-penalty-save-button"
              className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500"
              disabled={
                isPenaltySaving ||
                isPenaltyLoading ||
                repetitionPenalty < MIN_REPETITION_PENALTY ||
                repetitionPenalty > MAX_REPETITION_PENALTY
              }
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
