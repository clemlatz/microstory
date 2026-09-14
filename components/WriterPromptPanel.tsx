'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { fetchWriterPrompt, updateWriterPrompt } from '@/lib/writerPromptApi'
import { fetchMaxStoryWords, updateMaxStoryWords } from '@/lib/storyWordLimitApi'
import { DEFAULT_MAX_STORY_WORDS } from '@/lib/storyWordLimitDefaults'
import { fetchVerbatimWindowWords, updateVerbatimWindowWords } from '@/lib/verbatimWindowApi'
import { DEFAULT_VERBATIM_WINDOW_WORDS } from '@/lib/verbatimWindowDefaults'
import { fetchAutoSummaryThresholdWords, updateAutoSummaryThresholdWords } from '@/lib/autoSummaryThresholdApi'
import { DEFAULT_AUTO_SUMMARY_THRESHOLD_WORDS } from '@/lib/autoSummaryThresholdDefaults'
import { useLocale } from '@/lib/i18n/LocaleContext'

/**
 * Content of the "Écriture" section of the config panel: a free-form system
 * prompt (role, style, tone...) applied to every subsequent LLM call.
 */
export function WriterPromptPanel({ storyId }: { storyId: string }) {
  const { t } = useLocale()

  const errorMessage = useCallback(
    (error: unknown): string => (error instanceof Error && error.message ? error.message : t('common.genericError')),
    [t],
  )

  const [writerPrompt, setWriterPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState(false)

  const [maxStoryWords, setMaxStoryWords] = useState(DEFAULT_MAX_STORY_WORDS)
  const [isWordLimitLoading, setIsWordLimitLoading] = useState(true)
  const [isWordLimitSaving, setIsWordLimitSaving] = useState(false)
  const [wordLimitError, setWordLimitError] = useState<string | null>(null)
  const [wordLimitSavedMessage, setWordLimitSavedMessage] = useState(false)

  const [verbatimWindowWords, setVerbatimWindowWords] = useState(DEFAULT_VERBATIM_WINDOW_WORDS)
  const [isVerbatimWindowLoading, setIsVerbatimWindowLoading] = useState(true)
  const [isVerbatimWindowSaving, setIsVerbatimWindowSaving] = useState(false)
  const [verbatimWindowError, setVerbatimWindowError] = useState<string | null>(null)
  const [verbatimWindowSavedMessage, setVerbatimWindowSavedMessage] = useState(false)

  const [autoSummaryThresholdWords, setAutoSummaryThresholdWords] = useState(DEFAULT_AUTO_SUMMARY_THRESHOLD_WORDS)
  const [isAutoSummaryThresholdLoading, setIsAutoSummaryThresholdLoading] = useState(true)
  const [isAutoSummaryThresholdSaving, setIsAutoSummaryThresholdSaving] = useState(false)
  const [autoSummaryThresholdError, setAutoSummaryThresholdError] = useState<string | null>(null)
  const [autoSummaryThresholdSavedMessage, setAutoSummaryThresholdSavedMessage] = useState(false)

  useEffect(() => {
    fetchWriterPrompt(storyId)
      .then((loaded) => setWriterPrompt(loaded))
      .catch((err) => {
        console.error('Failed to load the writer prompt', err)
        setError(errorMessage(err))
      })
      .finally(() => setIsLoading(false))
  }, [storyId, errorMessage])

  useEffect(() => {
    fetchMaxStoryWords()
      .then((loaded) => setMaxStoryWords(loaded))
      .catch((err) => {
        console.error('Failed to load the story word limit', err)
        setWordLimitError(errorMessage(err))
      })
      .finally(() => setIsWordLimitLoading(false))
  }, [errorMessage])

  useEffect(() => {
    fetchVerbatimWindowWords()
      .then((loaded) => setVerbatimWindowWords(loaded))
      .catch((err) => {
        console.error('Failed to load the verbatim window words', err)
        setVerbatimWindowError(errorMessage(err))
      })
      .finally(() => setIsVerbatimWindowLoading(false))
  }, [errorMessage])

  useEffect(() => {
    fetchAutoSummaryThresholdWords()
      .then((loaded) => setAutoSummaryThresholdWords(loaded))
      .catch((err) => {
        console.error('Failed to load the auto-summary threshold words', err)
        setAutoSummaryThresholdError(errorMessage(err))
      })
      .finally(() => setIsAutoSummaryThresholdLoading(false))
  }, [errorMessage])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setSavedMessage(false)
    try {
      const saved = await updateWriterPrompt(storyId, writerPrompt)
      setWriterPrompt(saved)
      setSavedMessage(true)
    } catch (err) {
      console.error('Failed to save the writer prompt', err)
      setError(errorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleWordLimitSubmit(event: FormEvent) {
    event.preventDefault()
    setIsWordLimitSaving(true)
    setWordLimitError(null)
    setWordLimitSavedMessage(false)
    try {
      const saved = await updateMaxStoryWords(maxStoryWords)
      setMaxStoryWords(saved)
      setWordLimitSavedMessage(true)
    } catch (err) {
      console.error('Failed to save the story word limit', err)
      setWordLimitError(errorMessage(err))
    } finally {
      setIsWordLimitSaving(false)
    }
  }

  async function handleVerbatimWindowSubmit(event: FormEvent) {
    event.preventDefault()
    setIsVerbatimWindowSaving(true)
    setVerbatimWindowError(null)
    setVerbatimWindowSavedMessage(false)
    try {
      const saved = await updateVerbatimWindowWords(verbatimWindowWords)
      setVerbatimWindowWords(saved)
      setVerbatimWindowSavedMessage(true)
    } catch (err) {
      console.error('Failed to save the verbatim window words', err)
      setVerbatimWindowError(errorMessage(err))
    } finally {
      setIsVerbatimWindowSaving(false)
    }
  }

  async function handleAutoSummaryThresholdSubmit(event: FormEvent) {
    event.preventDefault()
    setIsAutoSummaryThresholdSaving(true)
    setAutoSummaryThresholdError(null)
    setAutoSummaryThresholdSavedMessage(false)
    try {
      const saved = await updateAutoSummaryThresholdWords(autoSummaryThresholdWords)
      setAutoSummaryThresholdWords(saved)
      setAutoSummaryThresholdSavedMessage(true)
    } catch (err) {
      console.error('Failed to save the auto-summary threshold words', err)
      setAutoSummaryThresholdError(errorMessage(err))
    } finally {
      setIsAutoSummaryThresholdSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
          {t('writerPrompt.title')}
        </h3>
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          {t('writerPrompt.description')}
        </p>
      </div>

      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <textarea
          data-testid="writer-prompt-input"
          className="resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          rows={6}
          placeholder={t('writerPrompt.placeholder')}
          value={writerPrompt}
          disabled={isLoading}
          onChange={(event) => {
            setWriterPrompt(event.target.value)
            setSavedMessage(false)
          }}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {savedMessage && !error && (
          <p className="text-sm text-green-600 dark:text-green-400">{t('writerPrompt.saved')}</p>
        )}
        <div>
          <button
            type="submit"
            data-testid="writer-prompt-save-button"
            className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500"
            disabled={isSaving || isLoading}
          >
            {t('common.save')}
          </button>
        </div>
      </form>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
          {t('writerPrompt.wordLimitTitle')}
        </h3>
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          {t('writerPrompt.wordLimitDescription')}
        </p>

        <form className="flex flex-col gap-2" onSubmit={handleWordLimitSubmit}>
          <input
            type="number"
            min={1}
            step={1}
            data-testid="story-word-limit-input"
            className="w-32 min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={maxStoryWords}
            disabled={isWordLimitLoading}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10)
              setMaxStoryWords(Number.isNaN(value) ? 0 : value)
              setWordLimitSavedMessage(false)
            }}
          />
          {wordLimitError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {wordLimitError}
            </p>
          )}
          {wordLimitSavedMessage && !wordLimitError && (
            <p className="text-sm text-green-600 dark:text-green-400">{t('writerPrompt.wordLimitSaved')}</p>
          )}
          <div>
            <button
              type="submit"
              data-testid="story-word-limit-save-button"
              className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500"
              disabled={isWordLimitSaving || isWordLimitLoading || maxStoryWords <= 0}
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
          {t('writerPrompt.verbatimTitle')}
        </h3>
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          {t('writerPrompt.verbatimDescription')}
        </p>

        <form className="flex flex-col gap-2" onSubmit={handleVerbatimWindowSubmit}>
          <input
            type="number"
            min={1}
            step={1}
            data-testid="verbatim-window-input"
            className="w-32 min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={verbatimWindowWords}
            disabled={isVerbatimWindowLoading}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10)
              setVerbatimWindowWords(Number.isNaN(value) ? 0 : value)
              setVerbatimWindowSavedMessage(false)
            }}
          />
          {verbatimWindowError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {verbatimWindowError}
            </p>
          )}
          {verbatimWindowSavedMessage && !verbatimWindowError && (
            <p className="text-sm text-green-600 dark:text-green-400">{t('writerPrompt.verbatimSaved')}</p>
          )}
          <div>
            <button
              type="submit"
              data-testid="verbatim-window-save-button"
              className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500"
              disabled={isVerbatimWindowSaving || isVerbatimWindowLoading || verbatimWindowWords <= 0}
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
          {t('writerPrompt.autoSummaryTitle')}
        </h3>
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          {t('writerPrompt.autoSummaryDescription')}
        </p>

        <form className="flex flex-col gap-2" onSubmit={handleAutoSummaryThresholdSubmit}>
          <input
            type="number"
            min={1}
            step={1}
            data-testid="auto-summary-threshold-input"
            className="w-32 min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={autoSummaryThresholdWords}
            disabled={isAutoSummaryThresholdLoading}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10)
              setAutoSummaryThresholdWords(Number.isNaN(value) ? 0 : value)
              setAutoSummaryThresholdSavedMessage(false)
            }}
          />
          {autoSummaryThresholdError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {autoSummaryThresholdError}
            </p>
          )}
          {autoSummaryThresholdSavedMessage && !autoSummaryThresholdError && (
            <p className="text-sm text-green-600 dark:text-green-400">{t('writerPrompt.autoSummarySaved')}</p>
          )}
          <div>
            <button
              type="submit"
              data-testid="auto-summary-threshold-save-button"
              className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-500"
              disabled={
                isAutoSummaryThresholdSaving || isAutoSummaryThresholdLoading || autoSummaryThresholdWords <= 0
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
