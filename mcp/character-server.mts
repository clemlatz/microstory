/**
 * POC: local (stdio) MCP server exposing microstory's story characters, for a
 * client running on the same machine (Claude Code, Claude Desktop). Reads
 * the same SQLite file the app uses (DATABASE_PATH) and reuses the app's own
 * repository functions — no separate data layer.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerCharacterTools } from '../lib/mcpCharacterTools'

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function loadDotEnvLocal(): void {
  const envPath = path.join(REPO_ROOT, '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

loadDotEnvLocal()

const server = new McpServer({ name: 'microstory-characters', version: '0.1.0' })
registerCharacterTools(server)

const transport = new StdioServerTransport()
await server.connect(transport)
