import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

async function callTool(server: McpServer, name: string, args: Record<string, unknown> = {}) {
  const tool = (server as unknown as { _registeredTools: Record<string, { handler: (args: unknown) => Promise<unknown> }> })
    ._registeredTools[name]
  if (!tool) throw new Error(`Tool ${name} not registered`)
  return tool.handler(args) as Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>
}

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
