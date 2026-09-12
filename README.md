# Microstory

Microstory is a self-hosted, characters-first worldbuilding app: keep your story's title, characters, and free-form notes in one place. It's a Next.js (App Router, TypeScript, Tailwind CSS) app backed by a real server — a SQLite-persisted knowledge base you manage from the UI and, optionally, from an external LLM (e.g. Claude Desktop) via MCP.

Access is gated behind a single WebAuthn passkey (biometrics, a security key, etc.) rather than a username/password — see [Authentication](#authentication) below.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later (native ESM + the App Router's requirements)
- A browser and device capable of a WebAuthn ceremony (Touch ID/Face ID, Windows Hello, a security key, or a platform authenticator on your phone) to register and use the login passkey
- Optionally, an MCP-capable client (e.g. Claude Desktop) if you want an external LLM to read/write your story's characters

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/clemlatz/microstory.git
cd microstory
npm install
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The very first visit takes you to a login screen where you register the app's one passkey; every subsequent visit authenticates with it (see [Authentication](#authentication)).

## Configuration

Configure Microstory with environment variables, e.g. in a `.env.local` file at the repo root:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_PATH` | Path to the SQLite database file (use `:memory:` for tests) | `data/chat.db` |
| `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` | Optional overrides for the passkey Relying Party ID/origin | derived from the incoming request's host/protocol |
| `MCP_ACCESS_TOKEN` | Bearer token required by the remote (HTTP) MCP endpoint (`/api/mcp`) | — |

### Running with Docker

```bash
docker compose up --build
```

- The SQLite database lives on the host, outside the image: the container mounts a volume, defaulting to `${HOME}/server/storage/microstory` (`DATABASE_PATH=/data/chat.db` inside the container), overridable via `MICROSTORY_STORAGE_PATH`.
- The app is then reachable at [http://localhost:3000](http://localhost:3000).

## Authentication

Microstory is a single-user app protected by exactly one WebAuthn passkey rather than a username/password:

- On first launch, the login screen offers to **register** a passkey — follow your browser/OS's biometric or security-key prompt.
- On every later visit, the same screen asks you to **authenticate** with that passkey.
- Once registered, the passkey can't be re-registered from the login screen (there is intentionally only ever one) — to reset it, clear the corresponding rows from the SQLite database.
- A signed-in session is long-lived (roughly 400 days, the longest a browser will honor) with no short automatic timeout; sign out explicitly with the logout button when needed.

## Usage

- Create a story from the stories list, then open it to reach its overview: title, characters, and notes.
- Manage **characters** (name + description) and free-form **notes** (title + content) directly from that overview.
- Optionally, connect an MCP client (e.g. Claude Desktop) to `/api/mcp` (or run the local `mcp/character-server.mts` stdio server) so an external LLM can list your stories and read/write character sheets alongside you.

## Development

```bash
npm run dev      # start the dev server (http://localhost:3000)
npm run build    # production build
npm run test     # run the full Vitest suite (vitest run)
npm run lint     # eslint
```

Run a single test file: `npx vitest run <path/to/file.test.ts(x)>`
Run a single test by name: `npx vitest run <path/to/file.test.tsx> -t "test name"`

Tests use Vitest + `@testing-library/react` + `jsdom`; the `@/*` import alias maps to the repo root.

For the full architecture (request flow, data model, feature-by-feature implementation notes), see [CLAUDE.md](./CLAUDE.md).

## Contributing

Issues and pull requests are welcome.

- Please open an issue describing the bug or feature before starting significant work, so the approach can be discussed first.
- Keep code, comments, commit messages, and PR descriptions in English (the app's own UI text may still be in French).
- Run `npm run lint` and `npm run test` before submitting a PR.
- See [CLAUDE.md](./CLAUDE.md) for the project's architecture and conventions in detail.

## License

[MIT](./LICENSE)
