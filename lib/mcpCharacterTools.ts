import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getAllStories } from './storiesRepository'
import { getAllCharacters, createCharacter, updateCharacter } from './charactersRepository'
import { getAllNotes, createNote, updateNote } from './notesRepository'

/**
 * Registers the character and note tools shared by every MCP transport
 * (stdio for local clients, Streamable HTTP for remote ones — see
 * mcp/character-server.mts and app/api/mcp/route.ts) so the tool behavior
 * stays identical regardless of how a client connects.
 *
 * Deliberately no delete tool for either: create/update only, so a misread
 * instruction can't make a character or note disappear.
 */
export function registerCharacterTools(server: McpServer): void {
  server.registerTool(
    'list_stories',
    {
      title: 'List stories',
      description: 'Lists the existing microstory stories (id and title), to find the id to pass to get_characters.',
      inputSchema: {},
    },
    async () => {
      const stories = getAllStories()
      const text = stories.length
        ? stories.map((s) => `- ${s.title} (id: ${s.id})`).join('\n')
        : 'No story found.'
      return { content: [{ type: 'text', text }] }
    },
  )

  server.registerTool(
    'get_characters',
    {
      title: 'Get character sheets',
      description:
        'Returns the list of characters (name + description) for a microstory story. If storyId is omitted, uses the most recently modified story.',
      inputSchema: {
        storyId: z
          .string()
          .optional()
          .describe('story id (see list_stories); omitted = most recent story'),
      },
    },
    async ({ storyId }) => {
      const targetStoryId = storyId ?? getAllStories()[0]?.id
      if (!targetStoryId) {
        return { content: [{ type: 'text', text: 'No story found.' }] }
      }

      const characters = getAllCharacters(targetStoryId)
      const text = characters.length
        ? characters.map((c) => `- ${c.name} (id: ${c.id}): ${c.description}`).join('\n')
        : 'No character for this story.'
      return { content: [{ type: 'text', text }] }
    },
  )

  server.registerTool(
    'create_character',
    {
      title: 'Create a character',
      description:
        'Creates a new character (name + description) in a microstory story. If storyId is omitted, uses the most recently modified story.',
      inputSchema: {
        name: z.string().min(1).describe('character name'),
        description: z.string().min(1).describe('character description'),
        storyId: z
          .string()
          .optional()
          .describe('story id (see list_stories); omitted = most recent story'),
      },
    },
    async ({ name, description, storyId }) => {
      const targetStoryId = storyId ?? getAllStories()[0]?.id
      if (!targetStoryId) {
        return { content: [{ type: 'text', text: 'No story found.' }], isError: true }
      }

      const character = createCharacter({ name, description }, targetStoryId)
      return { content: [{ type: 'text', text: `Character created: ${character.name} (id: ${character.id})` }] }
    },
  )

  server.registerTool(
    'update_character',
    {
      title: 'Update a character',
      description:
        "Updates the name and/or description of an existing character (see get_characters for its id). If storyId is omitted, uses the most recently modified story.",
      inputSchema: {
        id: z.string().describe('id of the character to update (see get_characters)'),
        name: z.string().min(1).describe('new character name'),
        description: z.string().min(1).describe('new character description'),
        storyId: z
          .string()
          .optional()
          .describe('story id (see list_stories); omitted = most recent story'),
      },
    },
    async ({ id, name, description, storyId }) => {
      const targetStoryId = storyId ?? getAllStories()[0]?.id
      if (!targetStoryId) {
        return { content: [{ type: 'text', text: 'No story found.' }], isError: true }
      }

      const character = updateCharacter(id, targetStoryId, { name, description })
      if (!character) {
        return { content: [{ type: 'text', text: `No character with id ${id} in this story.` }], isError: true }
      }
      return { content: [{ type: 'text', text: `Character updated: ${character.name} (id: ${character.id})` }] }
    },
  )

  server.registerTool(
    'get_notes',
    {
      title: 'Get story notes',
      description:
        'Returns the list of free-form notes (title + content) for a microstory story. If storyId is omitted, uses the most recently modified story.',
      inputSchema: {
        storyId: z
          .string()
          .optional()
          .describe('story id (see list_stories); omitted = most recent story'),
      },
    },
    async ({ storyId }) => {
      const targetStoryId = storyId ?? getAllStories()[0]?.id
      if (!targetStoryId) {
        return { content: [{ type: 'text', text: 'No story found.' }] }
      }

      const notes = getAllNotes(targetStoryId)
      const text = notes.length
        ? notes.map((n) => `- ${n.title} (id: ${n.id}): ${n.content}`).join('\n')
        : 'No note for this story.'
      return { content: [{ type: 'text', text }] }
    },
  )

  server.registerTool(
    'create_note',
    {
      title: 'Create a note',
      description:
        'Creates a new free-form note (title + content) in a microstory story. If storyId is omitted, uses the most recently modified story.',
      inputSchema: {
        title: z.string().min(1).describe('note title'),
        content: z.string().min(1).describe('note content'),
        storyId: z
          .string()
          .optional()
          .describe('story id (see list_stories); omitted = most recent story'),
      },
    },
    async ({ title, content, storyId }) => {
      const targetStoryId = storyId ?? getAllStories()[0]?.id
      if (!targetStoryId) {
        return { content: [{ type: 'text', text: 'No story found.' }], isError: true }
      }

      const note = createNote({ title, content }, targetStoryId)
      return { content: [{ type: 'text', text: `Note created: ${note.title} (id: ${note.id})` }] }
    },
  )

  server.registerTool(
    'update_note',
    {
      title: 'Update a note',
      description:
        "Updates the title and/or content of an existing note (see get_notes for its id). If storyId is omitted, uses the most recently modified story.",
      inputSchema: {
        id: z.string().describe('id of the note to update (see get_notes)'),
        title: z.string().min(1).describe('new note title'),
        content: z.string().min(1).describe('new note content'),
        storyId: z
          .string()
          .optional()
          .describe('story id (see list_stories); omitted = most recent story'),
      },
    },
    async ({ id, title, content, storyId }) => {
      const targetStoryId = storyId ?? getAllStories()[0]?.id
      if (!targetStoryId) {
        return { content: [{ type: 'text', text: 'No story found.' }], isError: true }
      }

      const note = updateNote(id, targetStoryId, { title, content })
      if (!note) {
        return { content: [{ type: 'text', text: `No note with id ${id} in this story.` }], isError: true }
      }
      return { content: [{ type: 'text', text: `Note updated: ${note.title} (id: ${note.id})` }] }
    },
  )
}
