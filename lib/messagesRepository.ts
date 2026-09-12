import { getDb } from './db'
import type { Message } from './types'

type MessageRow = {
  id: string
  role: Message['role']
  content: string
  timestamp: number
}

export function getAllMessages(storyId: string): Message[] {
  const db = getDb()
  return db
    .prepare('SELECT id, role, content, timestamp FROM messages WHERE story_id = ? ORDER BY timestamp ASC')
    .all(storyId) as MessageRow[]
}

export function replaceMessages(storyId: string, messages: Message[]): void {
  const db = getDb()
  const deleteAll = db.prepare('DELETE FROM messages WHERE story_id = ?')
  const insert = db.prepare(
    'INSERT INTO messages (id, role, content, timestamp, story_id) VALUES (@id, @role, @content, @timestamp, @storyId)',
  )

  const transaction = db.transaction((msgs: Message[]) => {
    deleteAll.run(storyId)
    for (const message of msgs) {
      insert.run({ ...message, storyId })
    }
  })

  transaction(messages)
}

export function appendMessage(message: Message, storyId: string): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO messages (id, role, content, timestamp, story_id) VALUES (@id, @role, @content, @timestamp, @storyId)',
  ).run({ ...message, storyId })
}

export function clearMessages(storyId: string): void {
  const db = getDb()
  db.prepare('DELETE FROM messages WHERE story_id = ?').run(storyId)
}
