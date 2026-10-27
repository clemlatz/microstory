# Product

## Register

product

## Users

A single writer (self-hosted, one passkey) who keeps the knowledge base of their fiction: characters, free-form notes, documentation, and a story presentation. Usage alternates between quick lookups mid-writing (find a character trait or a world rule without breaking flow) and longer editing sessions. An external LLM (e.g. Claude Desktop/mobile) reads and writes the same content through MCP, so the human UI is the place to review, correct, and curate what is stored.

## Product Purpose

Microstory is a self-hosted, characters-first worldbuilding knowledge base. It persists stories, characters, notes, documentation, and presentations to SQLite and exposes them two ways: an in-app UI for the human and MCP tools for an external LLM. The app itself never calls an LLM. Success: the writer trusts it as the durable source of truth for their universe, finds what they need in seconds, and edits without friction.

## Brand Personality

Precise, tooled, neutral. Calm and quiet: the interface stays out of the way of the writing. Three words: precise, calm, unobtrusive. Voice is plain and direct, no marketing tone, no cleverness in labels.

References: Notion (block editor, content-first pages), Linear (precision, controlled density, keyboard-friendly), Obsidian (personal knowledge base, long reading and writing).

## Anti-references

- Generic SaaS: identical card grids, purple gradients, hero metrics.
- "Magic" AI apps: sparkles, omnipresent chat, AI decoration (the app calls no LLM).
- Kitsch fantasy: parchment, medieval fonts, role-playing-game theming.
- Dense enterprise dashboards: tables and widgets everywhere.

## Design Principles

1. **Content first.** The writer's text is the interface; chrome recedes and never competes with it.
2. **Findable in seconds.** Navigation and search favor fast retrieval over exploration; structure should be obvious at a glance.
3. **One calm voice.** Restrained, consistent patterns across characters, notes, and documentation; the same action looks and behaves the same everywhere.
4. **Respect the long session.** Comfortable reading and editing for hours, in light or dark following the OS, with no visual noise or gratuitous motion.
5. **Honest state.** Saving, unsaved changes, and errors are always visible and plainly worded; nothing the writer typed is silently lost.

## Accessibility & Inclusion

WCAG 2.1 AA minimum (contrast, focus visibility, keyboard operability). Dark mode follows the OS preference automatically. Respect `prefers-reduced-motion`. All interactive elements keep a minimum 44px tap target (`min-h-11`). UI defaults to English with French as an opt-in language, so layouts must tolerate longer French strings.
