import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getAllStories } from './storiesRepository'
import { getAllCharacters, createCharacter, updateCharacter } from './charactersRepository'

/**
 * Registers the character tools shared by every MCP transport (stdio for
 * local clients, Streamable HTTP for remote ones — see
 * mcp/character-server.mts and app/api/mcp/route.ts) so the tool behavior
 * stays identical regardless of how a client connects.
 *
 * Deliberately no delete tool: create/update only, so a misread instruction
 * can't make a character disappear.
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
}
