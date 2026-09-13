import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getAllStories, getStoryById, updateStoryPresentation } from './storiesRepository'
import { getAllCharacters, createCharacter, updateCharacter } from './charactersRepository'
import { getAllNotes, createNote, updateNote } from './notesRepository'
import {
  getAllDocumentationEntries,
  createDocumentationEntry,
  updateDocumentationEntry,
} from './documentationRepository'

/**
 * Registers the character, note and documentation tools shared by every MCP
 * transport (stdio for local clients, Streamable HTTP for remote ones — see
 * mcp/character-server.mts and app/api/mcp/route.ts) so the tool behavior
 * stays identical regardless of how a client connects.
 *
 * Deliberately no delete tool for any of them: create/update only, so a
 * misread instruction can't make a character, note or documentation entry
 * disappear.
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
    'get_story_presentation',
    {
      title: 'Get story presentation',
      description:
        'Returns the presentation text (synopsis/pitch/context) of a microstory story. If storyId is omitted, uses the most recently modified story.',
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

      const story = getStoryById(targetStoryId)
      if (!story) {
        return { content: [{ type: 'text', text: `No story with id ${targetStoryId}.` }], isError: true }
      }

      return { content: [{ type: 'text', text: story.presentation || 'No presentation for this story.' }] }
    },
  )

  server.registerTool(
    'update_story_presentation',
    {
      title: 'Update the story presentation',
      description:
        'Updates the presentation text (synopsis/pitch/context) of a microstory story. If storyId is omitted, uses the most recently modified story.',
      inputSchema: {
        presentation: z.string().describe('new presentation text'),
        storyId: z
          .string()
          .optional()
          .describe('story id (see list_stories); omitted = most recent story'),
      },
    },
    async ({ presentation, storyId }) => {
      const targetStoryId = storyId ?? getAllStories()[0]?.id
      if (!targetStoryId) {
        return { content: [{ type: 'text', text: 'No story found.' }], isError: true }
      }

      const story = updateStoryPresentation(targetStoryId, presentation)
      if (!story) {
        return { content: [{ type: 'text', text: `No story with id ${targetStoryId}.` }], isError: true }
      }
      return { content: [{ type: 'text', text: `Presentation updated for story: ${story.title}` }] }
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

  server.registerTool(
    'get_documentation',
    {
      title: 'Get story documentation',
      description:
        "Returns the list of documentation entries (title + content + optional source url) for a microstory story — factual reference material (research, sources) archived to keep the story world credible. This is a write-target/archive, not an auto-consulted knowledge source: do not rely on existing entries to answer a new research question unless the user explicitly asks you to consult them. If storyId is omitted, uses the most recently modified story.",
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

      const entries = getAllDocumentationEntries(targetStoryId)
      const text = entries.length
        ? entries
            .map((entry) => `- ${entry.title} (id: ${entry.id})${entry.url ? ` [${entry.url}]` : ''}: ${entry.content}`)
            .join('\n')
        : 'No documentation for this story.'
      return { content: [{ type: 'text', text }] }
    },
  )

  server.registerTool(
    'create_documentation',
    {
      title: 'Create a documentation entry',
      description:
        'Archives a new documentation entry (title + content + optional source url) in a microstory story — use this to save factual research findings (e.g. an answer you found elsewhere) so the user can find them again, not to record personal ideas (use create_note for those instead). If storyId is omitted, uses the most recently modified story.',
      inputSchema: {
        title: z.string().min(1).describe('documentation entry title'),
        content: z.string().min(1).describe('documentation entry content'),
        url: z.string().optional().describe('optional link to the external source'),
        storyId: z
          .string()
          .optional()
          .describe('story id (see list_stories); omitted = most recent story'),
      },
    },
    async ({ title, content, url, storyId }) => {
      const targetStoryId = storyId ?? getAllStories()[0]?.id
      if (!targetStoryId) {
        return { content: [{ type: 'text', text: 'No story found.' }], isError: true }
      }

      const entry = createDocumentationEntry({ title, content, url: url ?? null }, targetStoryId)
      return { content: [{ type: 'text', text: `Documentation entry created: ${entry.title} (id: ${entry.id})` }] }
    },
  )

  server.registerTool(
    'update_documentation',
    {
      title: 'Update a documentation entry',
      description:
        "Updates the title, content and/or source url of an existing documentation entry (see get_documentation for its id). If storyId is omitted, uses the most recently modified story.",
      inputSchema: {
        id: z.string().describe('id of the documentation entry to update (see get_documentation)'),
        title: z.string().min(1).describe('new documentation entry title'),
        content: z.string().min(1).describe('new documentation entry content'),
        url: z.string().optional().describe('optional link to the external source'),
        storyId: z
          .string()
          .optional()
          .describe('story id (see list_stories); omitted = most recent story'),
      },
    },
    async ({ id, title, content, url, storyId }) => {
      const targetStoryId = storyId ?? getAllStories()[0]?.id
      if (!targetStoryId) {
        return { content: [{ type: 'text', text: 'No story found.' }], isError: true }
      }

      const entry = updateDocumentationEntry(id, targetStoryId, { title, content, url: url ?? null })
      if (!entry) {
        return {
          content: [{ type: 'text', text: `No documentation entry with id ${id} in this story.` }],
          isError: true,
        }
      }
      return { content: [{ type: 'text', text: `Documentation entry updated: ${entry.title} (id: ${entry.id})` }] }
    },
  )
}
