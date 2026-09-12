import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const storyId = 'story-1'

describe('charactersRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns an empty array when no characters exist', async () => {
    const { getAllCharacters } = await import('./charactersRepository')
    expect(getAllCharacters(storyId)).toEqual([])
  })

  it('createCharacter stores a new character with generated id and timestamps', async () => {
    const { createCharacter, getAllCharacters } = await import('./charactersRepository')

    const character = createCharacter({ name: 'Alice', description: 'Une héroïne curieuse' }, storyId)

    expect(character.id).toBeTypeOf('string')
    expect(character.name).toBe('Alice')
    expect(character.description).toBe('Une héroïne curieuse')
    expect(character.createdAt).toBeTypeOf('number')
    expect(character.updatedAt).toBe(character.createdAt)
    expect(getAllCharacters(storyId)).toEqual([character])
  })

  it('getAllCharacters orders results by createdAt ascending', async () => {
    const { createCharacter, getAllCharacters } = await import('./charactersRepository')
    const first = createCharacter({ name: 'Alice', description: 'Première' }, storyId)
    const second = createCharacter({ name: 'Bob', description: 'Deuxième' }, storyId)

    expect(getAllCharacters(storyId)).toEqual([first, second])
  })

  it('getCharacterById returns the matching character or null', async () => {
    const { createCharacter, getCharacterById } = await import('./charactersRepository')
    const character = createCharacter({ name: 'Alice', description: 'Une héroïne' }, storyId)

    expect(getCharacterById(character.id, storyId)).toEqual(character)
    expect(getCharacterById('missing-id', storyId)).toBeNull()
  })

  it('updateCharacter modifies name and description and bumps updatedAt', async () => {
    const { createCharacter, updateCharacter, getCharacterById } = await import(
      './charactersRepository'
    )
    const character = createCharacter({ name: 'Alice', description: 'Une héroïne' }, storyId)

    const updated = updateCharacter(character.id, storyId, {
      name: 'Alice Doe',
      description: 'Une héroïne intrépide',
    })

    expect(updated).not.toBeNull()
    expect(updated?.name).toBe('Alice Doe')
    expect(updated?.description).toBe('Une héroïne intrépide')
    expect(updated?.createdAt).toBe(character.createdAt)
    expect(getCharacterById(character.id, storyId)).toEqual(updated)
  })

  it('updateCharacter returns null when the character does not exist', async () => {
    const { updateCharacter } = await import('./charactersRepository')
    expect(updateCharacter('missing-id', storyId, { name: 'X', description: 'Y' })).toBeNull()
  })

  it('updateCharacter backs up the previous name/description into character_versions', async () => {
    const { createCharacter, updateCharacter } = await import('./charactersRepository')
    const { getDb } = await import('./db')
    const character = createCharacter({ name: 'Alice', description: 'Une héroïne' }, storyId)

    updateCharacter(character.id, storyId, { name: 'Alice Doe', description: 'Une héroïne intrépide' })
    updateCharacter(character.id, storyId, { name: 'Alice Doe Two', description: 'Encore autre chose' })

    const versions = getDb()
      .prepare(
        'SELECT character_id, story_id, name, description FROM character_versions WHERE character_id = ? ORDER BY created_at ASC',
      )
      .all(character.id)

    expect(versions).toEqual([
      { character_id: character.id, story_id: storyId, name: 'Alice', description: 'Une héroïne' },
      {
        character_id: character.id,
        story_id: storyId,
        name: 'Alice Doe',
        description: 'Une héroïne intrépide',
      },
    ])
  })

  it('deleteCharacter removes the character', async () => {
    const { createCharacter, deleteCharacter, getAllCharacters } = await import(
      './charactersRepository'
    )
    const character = createCharacter({ name: 'Alice', description: 'Une héroïne' }, storyId)
    deleteCharacter(character.id, storyId)
    expect(getAllCharacters(storyId)).toEqual([])
  })

  it('deleteCharacter also removes its versions', async () => {
    const { createCharacter, updateCharacter, deleteCharacter } = await import(
      './charactersRepository'
    )
    const { getDb } = await import('./db')
    const character = createCharacter({ name: 'Alice', description: 'Une héroïne' }, storyId)
    updateCharacter(character.id, storyId, { name: 'Alice Doe', description: 'Autre' })

    deleteCharacter(character.id, storyId)

    const versions = getDb()
      .prepare('SELECT * FROM character_versions WHERE character_id = ?')
      .all(character.id)
    expect(versions).toEqual([])
  })

  it('deleteCharacter on a missing id does not throw', async () => {
    const { deleteCharacter } = await import('./charactersRepository')
    expect(() => deleteCharacter('missing-id', storyId)).not.toThrow()
  })

  it('scopes characters by storyId, not returning another story\'s characters', async () => {
    const { createCharacter, getAllCharacters } = await import('./charactersRepository')
    const character = createCharacter({ name: 'Alice', description: 'Une héroïne' }, storyId)
    const otherCharacter = createCharacter({ name: 'Carol', description: 'Autre histoire' }, 'story-2')

    expect(getAllCharacters(storyId)).toEqual([character])
    expect(getAllCharacters('story-2')).toEqual([otherCharacter])
  })

  describe('buildCharactersSystemMessage', () => {
    it('returns null when there are no characters', async () => {
      const { buildCharactersSystemMessage } = await import('./charactersRepository')
      expect(buildCharactersSystemMessage([])).toBeNull()
    })

    it('serializes each character name and description into a system prompt', async () => {
      const { buildCharactersSystemMessage } = await import('./charactersRepository')
      const message = buildCharactersSystemMessage([
        { id: '1', name: 'Alice', description: 'Une héroïne curieuse', createdAt: 1, updatedAt: 1 },
        { id: '2', name: 'Bob', description: 'Un sidekick loyal', createdAt: 2, updatedAt: 2 },
      ])

      expect(message).toContain('Alice')
      expect(message).toContain('Une héroïne curieuse')
      expect(message).toContain('Bob')
      expect(message).toContain('Un sidekick loyal')
    })
  })
})
