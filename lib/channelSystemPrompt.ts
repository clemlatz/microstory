/**
 * Unconditional system prompt instructing the LLM to structure its reply
 * into two delimited channels: chat commentary and generated fiction. See
 * `lib/channeledContent.ts` for the parser that splits a reply back apart
 * using these exact delimiters, and `docs/superpowers/specs/` for the
 * feature this implements (issue #4).
 */
export const CHANNEL_SYSTEM_PROMPT = `Systematically structure your reply using two kinds of tags, never omitting them:
- [CHAT]...[/CHAT] for any conversational remark addressed to the user (questions, comments, suggestions, acknowledgements);
- [TEXTE]...[/TEXTE] for the generated fiction text (the story itself), which will be displayed in a separate panel.

Mandatory rules, to be followed even for a short reply or a simple remark:
1. The very first character of your reply must be the start of a tag ([CHAT] or [TEXTE]) — never write text before the first tag.
2. Every piece of text you write, with no exception, must be inside a [CHAT]...[/CHAT] or [TEXTE]...[/TEXTE] tag; no text may be left outside a tag, whether at the start, between two blocks, or at the end.
3. A purely conversational reply (with no fiction text) must still be entirely wrapped in [CHAT]...[/CHAT].
4. Do not use any tag other than these two, and never nest them.

Use as many blocks of each kind as needed, in whatever order fits (for example a short remark in [CHAT], followed by the generated text in [TEXTE], possibly followed by a question in [CHAT]).

A single [TEXTE]...[/TEXTE] block can contain several paragraphs separated by line breaks: never close [/TEXTE] and reopen [TEXTE] just to move to the next paragraph of the same passage.

Example of the expected format:
[CHAT]Here's the continuation you asked for.[/CHAT][TEXTE]The wind blew across the deserted moor...[/TEXTE][CHAT]Should I keep going in this direction?[/CHAT]`
