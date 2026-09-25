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
import { createStory, updateStoryPresentation } from '../lib/storiesRepository'
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

updateStoryPresentation(
  story.id,
  `In Rivenhollow, a fog-bound mountain town, an old clock tower keeps a secret: the great clock can borrow a single day from the past and replay it. Adaline Marrow, the town's last clockmaker, built the mechanism and has spent years trying to forget it exists.

When the merchant Corwin Vale arrives chasing a rumor of a clock that can undo a day, the fragile silence around the tower begins to crack. Old Bram, the gravedigger, knows who owned the tower before Adaline, and he knows why they left.

The Clockmaker of Rivenhollow is a slow, atmospheric story about regret, borrowed time, and the price of wanting one more day. Tone: gothic, quiet, melancholic, with a mechanical precision underneath. Themes: grief, responsibility for what we create, the illusion of a clean reset.`,
)
console.log('  + presentation')

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
  {
    name: 'Mira Thistlewood',
    description:
      "Adaline's teenage apprentice, curious and fearless. She has noticed that the tower clock loses a few minutes every full moon and is slowly piecing together why. Her curiosity is the story's fuse.",
  },
  {
    name: 'Sheriff Odalys Renn',
    description:
      'The town sheriff, pragmatic and worn down by decades of keeping Rivenhollow calm. She suspects Corwin is a swindler and distrusts anything she cannot arrest. Privately, she lost someone on a day she would give anything to replay.',
  },
  {
    name: 'The Hollow Clerk',
    description:
      'A pale, courteous figure who appears in the town records office whenever a day is borrowed, correcting the ledgers. Nobody remembers hiring him. Whether he is a person, a residue of the clock, or something older is left open.',
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
  {
    title: 'The fog',
    content:
      'The fog of Rivenhollow thickens whenever a day is borrowed and thins slowly afterwards. Locals read it like a barometer of the clock\'s use. Nobody says out loud that it is also what makes memories of the replayed day fade.',
  },
  {
    title: 'Who remembers a borrowed day',
    content:
      'Only the person who winds the clock keeps a full memory of the original day. Everyone else keeps a vague unease, a feeling of déjà vu. Old Bram is the exception, for reasons yet to be explained.',
  },
  {
    title: 'Timeline of the tower',
    content:
      'Year 0: settlers found Rivenhollow and raise the tower. Year 41: the first clockmaker vanishes overnight. Year 58: the tower stops for a week and the town loses seven days from its records. Year 79: Adaline arrives and restores the clock.',
  },
  {
    title: 'Open questions',
    content:
      'What happened to the previous clockmaker? What is the Hollow Clerk? Is a borrowed day really erased, or does it go somewhere? Decide before writing the third act.',
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
  {
    title: 'Alpine mountain villages, daily life and architecture',
    content:
      'Reference on 19th-century alpine villages: stone and timber houses, communal bell towers, winter isolation. Used to describe Rivenhollow\'s streets, seasons and the rhythm of its inhabitants.',
    url: 'https://en.wikipedia.org/wiki/Alpine_village',
  },
  {
    title: 'Grief and regret in fiction',
    content:
      'Notes on how stories handle regret and the wish to undo the past (e.g. "what if I could go back"), and common pitfalls: cheap resets, consequence-free redos. Guides the theme of the story\'s ending.',
    url: null,
  },
  {
    title: 'Watchmaking vocabulary',
    content:
      'Glossary of terms for descriptions: mainspring, balance wheel, pallet fork, arbor, train, jewel bearing, mainplate. Helps keep the workshop scenes precise and evocative.',
    url: 'https://en.wikipedia.org/wiki/Glossary_of_clock_terms',
  },
]

for (const input of documentationEntries) {
  const entry = createDocumentationEntry(input, story.id)
  console.log(`  + documentation: ${entry.title}`)
}

console.log('Done.')
