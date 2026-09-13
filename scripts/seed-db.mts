#!/usr/bin/env -S npx tsx
/**
 * Wipes the local SQLite database and refills it with fake data, for local
 * development/manual testing. Deletes the whole DB file (rather than
 * DELETE-ing rows table by table) so the schema is also rebuilt from
 * scratch by lib/db.ts's getDb() on next access — the safest way to start
 * from a genuinely clean slate.
 *
 * Usage: npx tsx scripts/seed-db.mts
 */

import fs from 'node:fs'
import { resolveDbPath } from '../lib/db'
import { createStory } from '../lib/storiesRepository'
import { createCharacter } from '../lib/charactersRepository'
import { createNote } from '../lib/notesRepository'
import { createDocumentationEntry } from '../lib/documentationRepository'
import { appendMessage } from '../lib/messagesRepository'
import { randomUUID } from 'node:crypto'
import type { Message } from '../lib/types'

const dbPath = resolveDbPath()
if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
  fs.rmSync(dbPath)
  console.log(`Deleted existing database at ${dbPath}`)
}

function userMessage(content: string, timestamp: number): Message {
  return { id: randomUUID(), role: 'user', content, timestamp }
}

function assistantMessage(chat: string, story: string, timestamp: number): Message {
  const content = `[CHAT]${chat}[/CHAT]\n[TEXTE]${story}[/TEXTE]`
  return { id: randomUUID(), role: 'assistant', content, timestamp }
}

const story = createStory('The Clockmaker of Rivenhollow')
console.log(`Created story "${story.title}" (${story.id})`)

const characters = [
  {
    name: 'Adaline Marrow',
    description:
      'A reclusive clockmaker in her fifties, haunted by a device she built that seems to run backwards in time. Sharp-tongued but secretly terrified of what she has made.',
  },
  {
    name: 'Corwin Vale',
    description:
      "A traveling merchant who stumbles into Rivenhollow chasing a rumor of a clock that can undo a single day. Charming, opportunistic, but not without a conscience.",
  },
  {
    name: 'Old Bram',
    description:
      'The town gravedigger, the only person who remembers the previous owner of the clock tower. Speaks in riddles and is more aware of the town\'s secrets than he lets on.',
  },
]

for (const input of characters) {
  const character = createCharacter(input, story.id)
  console.log(`  + character: ${character.name}`)
}

const notes = [
  {
    title: 'The town of Rivenhollow',
    content:
      'A small mountain town built around an old clock tower. Perpetually foggy. Founded three generations ago by settlers fleeing a war never named in the town records.',
  },
  {
    title: 'Rule: the clock can only be wound once per moon',
    content:
      'Winding the clock more than once per lunar cycle causes the "borrowed" day to unravel violently instead of resetting cleanly — this is the central danger of the story.',
  },
]

for (const input of notes) {
  const note = createNote(input, story.id)
  console.log(`  + note: ${note.title}`)
}

const documentationEntries = [
  {
    title: 'Mechanical clock escapements, 18th century',
    content:
      'Reference notes on verge and anchor escapements, used to keep the clockmaking details in the story grounded in real period mechanisms.',
    url: 'https://en.wikipedia.org/wiki/Escapement',
  },
  {
    title: 'Folklore of time loops',
    content:
      'Collected notes on time-loop myths across cultures, used as inspiration for the "borrowed day" mechanic without copying any single source directly.',
    url: null,
  },
]

for (const input of documentationEntries) {
  const entry = createDocumentationEntry(input, story.id)
  console.log(`  + documentation: ${entry.title}`)
}

const now = Date.now()
const turns: [string, string, string][] = [
  [
    'Start the story with Corwin arriving in Rivenhollow at dusk, asking around about the clock tower.',
    "Corwin, always after a good lead, is already asking around town about the clock tower.",
    'The fog rolled into Rivenhollow before the sun had properly set, curling around the lamp posts like it owned them. Corwin Vale pulled his collar up and stepped into the only tavern with its lights still on. "The clock tower," he said to the barkeep, dropping a coin on the counter. "Who keeps the key?"',
  ],
  [
    'Introduce Adaline refusing to talk to him, then have Old Bram mention the previous owner.',
    "Adaline shuts him down fast, but Old Bram is more talkative once the merchant pays for his drink.",
    'Adaline Marrow did not so much answer questions as end conversations. "The tower is not for tourists," she said, and turned back to her workbench without another word. It was Old Bram, three tables over, who leaned in once Corwin bought him a second drink. "The last one who wound that clock past her limit," he said, "we buried what was left of him behind the chapel."',
  ],
]

let timestamp = now - turns.length * 60_000
for (const [prompt, chat, storyText] of turns) {
  appendMessage(userMessage(prompt, timestamp), story.id)
  timestamp += 30_000
  appendMessage(assistantMessage(chat, storyText, timestamp), story.id)
  timestamp += 30_000
}

console.log(`  + ${turns.length} conversation turn(s) seeded`)
console.log('Done.')
