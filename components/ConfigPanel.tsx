'use client'

import { useState, type ReactNode } from 'react'

export type ConfigPanelSection = {
  id: string
  label: string
  content: ReactNode
}

type ConfigPanelProps = {
  open: boolean
  onClose: () => void
  sections: ConfigPanelSection[]
}

/**
 * Generic left-hand side panel, hidden by default, toggled from the main
 * interface. Organizes its content into sections (rendered as tabs when
 * there is more than one) so it can be reused across config features
 * (characters, writer prompt, ...) without duplicating the panel chrome.
 */
export function ConfigPanel({ open, onClose, sections }: ConfigPanelProps) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id)

  if (!open) return null

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0]

  return (
    <>
      <div
        data-testid="config-panel-backdrop"
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <aside
        data-testid="config-panel"
        className="fixed inset-y-0 left-0 z-50 flex w-full max-w-sm flex-col border-r border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Configuration</h2>
          <button
            data-testid="config-panel-close"
            type="button"
            className="text-sm text-gray-500 hover:underline dark:text-gray-400"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
        {sections.length > 1 && (
          <div className="flex shrink-0 gap-1 border-b border-gray-200 p-2 dark:border-gray-800">
            {sections.map((section) => (
              <button
                key={section.id}
                data-testid={`config-panel-tab-${section.id}`}
                type="button"
                aria-pressed={section.id === activeSection?.id}
                className={
                  section.id === activeSection?.id
                    ? 'rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium dark:bg-gray-800'
                    : 'rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900'
                }
                onClick={() => setActiveSectionId(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{activeSection?.content}</div>
      </aside>
    </>
  )
}
