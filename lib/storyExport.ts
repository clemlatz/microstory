import JSZip from 'jszip'
import { getStoryById } from './storiesRepository'
import { getAllCharacters } from './charactersRepository'
import { getAllNotes } from './notesRepository'
import { getAllDocumentationEntries } from './documentationRepository'

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  )
}

function uniqueFileName(folder: string, title: string, id: string, usedNames: Set<string>): string {
  const slug = slugify(title)
  const plainName = `${folder}/${slug}.md`
  if (!usedNames.has(plainName)) {
    usedNames.add(plainName)
    return plainName
  }

  const disambiguatedName = `${folder}/${slug}-${id.slice(0, 8)}.md`
  usedNames.add(disambiguatedName)
  return disambiguatedName
}

export async function buildStoryBackupZip(storyId: string): Promise<Buffer | null> {
  const story = getStoryById(storyId)
  if (!story) return null

  const zip = new JSZip()
  zip.file('presentation.md', `# ${story.title}\n\n${story.presentation}\n`)

  const usedNames = new Set<string>()

  for (const character of getAllCharacters(storyId)) {
    const name = uniqueFileName('characters', character.name, character.id, usedNames)
    zip.file(name, `# ${character.name}\n\n${character.description}\n`)
  }

  for (const note of getAllNotes(storyId)) {
    const name = uniqueFileName('notes', note.title, note.id, usedNames)
    zip.file(name, `# ${note.title}\n\n${note.content}\n`)
  }

  for (const entry of getAllDocumentationEntries(storyId)) {
    const name = uniqueFileName('documentation', entry.title, entry.id, usedNames)
    const sourceLine = entry.url ? `\n\nSource: ${entry.url}\n` : '\n'
    zip.file(name, `# ${entry.title}\n\n${entry.content}${sourceLine}`)
  }

  return zip.generateAsync({ type: 'nodebuffer' })
}
