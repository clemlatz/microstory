import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

async function callTool(server: McpServer, name: string, args: Record<string, unknown> = {}) {
  const tool = (server as unknown as { _registeredTools: Record<string, { handler: (args: unknown) => Promise<unknown> }> })
    ._registeredTools[name]
  if (!tool) throw new Error(`Tool ${name} not registered`)
  return tool.handler(args) as Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>
}

describe('mcpCharacterTools - story presentation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('get_story_presentation reports no story found when there is no story', async () => {
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const result = await callTool(server, 'get_story_presentation')

    expect(result.content[0].text).toBe('No story found.')
  })

  it('get_story_presentation reports no presentation for a story with none', async () => {
    const { createStory } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const story = createStory('My story')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const result = await callTool(server, 'get_story_presentation', { storyId: story.id })

    expect(result.content[0].text).toBe('No presentation for this story.')
  })

  it('update_story_presentation updates it and get_story_presentation reflects it', async () => {
    const { createStory } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const story = createStory('My story')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const updated = await callTool(server, 'update_story_presentation', {
      presentation: 'A polar station cut off from the world.',
      storyId: story.id,
    })
    expect(updated.content[0].text).toBe('Presentation updated for story: My story')

    const fetched = await callTool(server, 'get_story_presentation', { storyId: story.id })
    expect(fetched.content[0].text).toBe('A polar station cut off from the world.')
  })

  it('update_story_presentation defaults to the most recently modified story when storyId is omitted', async () => {
    const { createStory, getAllStories } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    createStory('Older story')
    createStory('Recent story')
    const defaultStoryId = getAllStories()[0].id
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    await callTool(server, 'update_story_presentation', { presentation: 'A pitch.' })

    const { getStoryById } = await import('./storiesRepository')
    expect(getStoryById(defaultStoryId)?.presentation).toBe('A pitch.')
  })

  it('update_story_presentation reports an error for an unknown story id', async () => {
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const result = await callTool(server, 'update_story_presentation', {
      presentation: 'A pitch.',
      storyId: 'missing-id',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('No story with id missing-id.')
  })
})

describe('mcpCharacterTools - notes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('get_notes reports no story found when there is no story', async () => {
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const result = await callTool(server, 'get_notes')

    expect(result.content[0].text).toBe('No story found.')
  })

  it('get_notes reports no note for a story with none', async () => {
    const { createStory } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const story = createStory('My story')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const result = await callTool(server, 'get_notes', { storyId: story.id })

    expect(result.content[0].text).toBe('No note for this story.')
  })

  it('create_note creates a note and get_notes lists it', async () => {
    const { createStory } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const story = createStory('My story')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const created = await callTool(server, 'create_note', {
      title: 'Lore',
      content: 'The kingdom was founded long ago.',
      storyId: story.id,
    })
    expect(created.content[0].text).toMatch(/^Note created: Lore \(id: .+\)$/)

    const listed = await callTool(server, 'get_notes', { storyId: story.id })
    expect(listed.content[0].text).toMatch(/^- Lore \(id: .+\): The kingdom was founded long ago\.$/)
  })

  it('create_note defaults to the most recently modified story when storyId is omitted', async () => {
    const { createStory, getAllStories } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    createStory('Older story')
    createStory('Recent story')
    const defaultStoryId = getAllStories()[0].id
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    await callTool(server, 'create_note', { title: 'Note', content: 'Content' })

    const { getAllNotes } = await import('./notesRepository')
    expect(getAllNotes(defaultStoryId)).toHaveLength(1)
  })

  it('update_note updates an existing note', async () => {
    const { createStory } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const story = createStory('My story')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const created = await callTool(server, 'create_note', { title: 'Lore', content: 'Draft', storyId: story.id })
    const id = created.content[0].text.match(/id: (.+)\)$/)?.[1]

    const updated = await callTool(server, 'update_note', {
      id,
      title: 'Lore, revised',
      content: 'Final version',
      storyId: story.id,
    })

    expect(updated.content[0].text).toBe(`Note updated: Lore, revised (id: ${id})`)
  })

  it('update_note reports an error when the note does not exist', async () => {
    const { createStory } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const story = createStory('My story')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const result = await callTool(server, 'update_note', {
      id: 'missing-id',
      title: 'Title',
      content: 'Content',
      storyId: story.id,
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('No note with id missing-id in this story.')
  })
})

describe('mcpCharacterTools - documentation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('get_documentation reports no story found when there is no story', async () => {
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const result = await callTool(server, 'get_documentation')

    expect(result.content[0].text).toBe('No story found.')
  })

  it('get_documentation reports no documentation for a story with none', async () => {
    const { createStory } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const story = createStory('My story')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const result = await callTool(server, 'get_documentation', { storyId: story.id })

    expect(result.content[0].text).toBe('No documentation for this story.')
  })

  it('create_documentation creates an entry and get_documentation lists it, including its url', async () => {
    const { createStory } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const story = createStory('My story')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const created = await callTool(server, 'create_documentation', {
      title: 'Lunar gravity',
      content: 'A sixth of Earth gravity.',
      url: 'https://example.com/gravity',
      storyId: story.id,
    })
    expect(created.content[0].text).toMatch(/^Documentation entry created: Lunar gravity \(id: .+\)$/)

    const listed = await callTool(server, 'get_documentation', { storyId: story.id })
    expect(listed.content[0].text).toMatch(
      /^- Lunar gravity \(id: .+\) \[https:\/\/example\.com\/gravity\]: A sixth of Earth gravity\.$/,
    )
  })

  it('create_documentation defaults to the most recently modified story when storyId is omitted', async () => {
    const { createStory, getAllStories } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    createStory('Older story')
    createStory('Recent story')
    const defaultStoryId = getAllStories()[0].id
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    await callTool(server, 'create_documentation', { title: 'Entry', content: 'Content' })

    const { getAllDocumentationEntries } = await import('./documentationRepository')
    expect(getAllDocumentationEntries(defaultStoryId)).toHaveLength(1)
  })

  it('update_documentation updates an existing entry', async () => {
    const { createStory } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const story = createStory('My story')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const created = await callTool(server, 'create_documentation', {
      title: 'Lunar gravity',
      content: 'Draft',
      storyId: story.id,
    })
    const id = created.content[0].text.match(/id: (.+)\)$/)?.[1]

    const updated = await callTool(server, 'update_documentation', {
      id,
      title: 'Lunar gravity, revised',
      content: 'Final version',
      storyId: story.id,
    })

    expect(updated.content[0].text).toBe(`Documentation entry updated: Lunar gravity, revised (id: ${id})`)
  })

  it('update_documentation reports an error when the entry does not exist', async () => {
    const { createStory } = await import('./storiesRepository')
    const { registerCharacterTools } = await import('./mcpCharacterTools')
    const story = createStory('My story')
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    registerCharacterTools(server)

    const result = await callTool(server, 'update_documentation', {
      id: 'missing-id',
      title: 'Title',
      content: 'Content',
      storyId: story.id,
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('No documentation entry with id missing-id in this story.')
  })
})
