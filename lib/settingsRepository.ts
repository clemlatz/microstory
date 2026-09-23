import { getDb } from './db'

type SettingRow = {
  value: string
}

function getSetting(key: string): string {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | SettingRow
    | undefined
  return row?.value ?? ''
}

function setSetting(key: string, value: string): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = @value',
  ).run({ key, value })
}

const CURRENT_STORY_ID_KEY = 'currentStoryId'

/** The id of the story currently shown/edited by the UI (global, unscoped). */
export function getCurrentStoryId(): string | null {
  const stored = getSetting(CURRENT_STORY_ID_KEY)
  return stored || null
}

export function setCurrentStoryId(id: string): void {
  setSetting(CURRENT_STORY_ID_KEY, id)
}
