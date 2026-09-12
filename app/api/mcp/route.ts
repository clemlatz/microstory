import { timingSafeEqual } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { registerCharacterTools } from '@/lib/mcpCharacterTools'

/**
 * Remote (Streamable HTTP) counterpart of mcp/character-server.mts, for
 * clients that can't spawn a local stdio process — Claude web's connectors.
 * Same tools, same repositories; the only new concern here is that this
 * endpoint is reachable over the network, hence the bearer-token check.
 */

function isAuthorized(request: Request): boolean {
  const expected = process.env.MCP_ACCESS_TOKEN
  if (!expected) return false

  const auth = request.headers.get('authorization')
  const provided = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null
  if (!provided) return false

  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer)
}

async function handle(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Stateless per the SDK's own requirement: a fresh transport (and server)
  // per request, since a stateless transport can't be reused across requests.
  const server = new McpServer({ name: 'microstory-characters', version: '0.1.0' })
  registerCharacterTools(server)

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)

  return transport.handleRequest(request)
}

export async function POST(request: Request) {
  return handle(request)
}

export async function GET(request: Request) {
  return handle(request)
}

export async function DELETE(request: Request) {
  return handle(request)
}
