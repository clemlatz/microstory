# Changelog

## Unreleased

- Editing a character now opens a dedicated, Notion-style page (`/story/[id]/character/[characterId]`) with large fields, instead of an inline form on the story home view. The character list still shows an excerpt and the delete action stays there.
- The character description field on that page is now a BlockNote rich-text block editor (Notion-style formatting) instead of a plain textarea. The description is still stored as a single markdown string.
- The character edit page now uses the name field itself as the page title (no separate heading or field labels), with the save button aligned next to it, and the description editor filling the rest of the viewport. The cancel button was removed — the back link above serves the same purpose.
- The description editor no longer has its own bordered box or background — it blends into the page background, Notion-style.
- Fixed the description editor's background still showing white/dark-gray instead of the page's own background, and its text being indented relative to the title. The background override now targets the editor's `.bn-editor` element directly rather than a CSS variable declared on a separate, portal-rendered BlockNote element that was never actually reached.
- The character edit page now autosaves: the save button is gone, and edits to the name or description are persisted automatically a moment after you stop typing (a pending save is flushed immediately when navigating back, so the last edit is never lost).
