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

const dbPath = resolveDbPath()
if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
  fs.rmSync(dbPath)
  console.log(`Deleted existing database at ${dbPath}`)
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

console.log('Done.')
