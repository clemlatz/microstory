import { describe, expect, it, vi, beforeEach } from 'vitest'
import JSZip from 'jszip'

vi.stubEnv('DATABASE_PATH', ':memory:')

describe('buildStoryBackupZip', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns null for an unknown story id', async () => {
    const { buildStoryBackupZip } = await import('./storyExport')
    expect(await buildStoryBackupZip('missing')).toBeNull()
  })

  it('includes the story presentation, characters, notes and documentation as markdown', async () => {
    const { createStory, updateStoryPresentation } = await import('./storiesRepository')
    const { createCharacter } = await import('./charactersRepository')
    const { createNote } = await import('./notesRepository')
    const { createDocumentationEntry } = await import('./documentationRepository')
    const { buildStoryBackupZip } = await import('./storyExport')

    const story = createStory('Les Brumes de Kaldheim')
    updateStoryPresentation(story.id, 'Une saga nordique.')
    createCharacter({ name: 'Elara Vane', description: 'Une exploratrice.' }, story.id)
    createNote({ title: 'Règle magique', content: 'La magie coûte du sang.' }, story.id)
    createDocumentationEntry(
      { title: 'Mythologie norroise', content: 'Recherche sur les sagas.', url: 'https://example.com' },
      story.id,
    )

    const buffer = await buildStoryBackupZip(story.id)
    expect(buffer).not.toBeNull()

    const zip = await JSZip.loadAsync(buffer as Buffer)
    const fileNames = Object.keys(zip.files)
    expect(fileNames).toContain('presentation.md')
    expect(fileNames).toContain('characters/elara-vane.md')
    expect(fileNames).toContain('notes/regle-magique.md')
    expect(fileNames).toContain('documentation/mythologie-norroise.md')

    const presentation = await zip.file('presentation.md')!.async('string')
    expect(presentation).toContain('Les Brumes de Kaldheim')
    expect(presentation).toContain('Une saga nordique.')

    const character = await zip.file('characters/elara-vane.md')!.async('string')
    expect(character).toContain('Elara Vane')
    expect(character).toContain('Une exploratrice.')

    const documentation = await zip.file('documentation/mythologie-norroise.md')!.async('string')
    expect(documentation).toContain('https://example.com')
  })

  it('deduplicates markdown file names when two entries share the same slug', async () => {
    const { createStory } = await import('./storiesRepository')
    const { createCharacter } = await import('./charactersRepository')
    const { buildStoryBackupZip } = await import('./storyExport')

    const story = createStory('Story')
    createCharacter({ name: 'Same Name', description: 'First.' }, story.id)
    createCharacter({ name: 'Same Name', description: 'Second.' }, story.id)

    const buffer = await buildStoryBackupZip(story.id)
    const zip = await JSZip.loadAsync(buffer as Buffer)
    const fileNames = new Set(
      Object.keys(zip.files).filter((name) => name.startsWith('characters/') && !name.endsWith('/')),
    )
    expect(fileNames.size).toBe(2)
    expect(fileNames.has('characters/same-name.md')).toBe(true)
  })
})
