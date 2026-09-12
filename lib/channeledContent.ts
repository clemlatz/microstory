/**
 * The LLM is instructed (see `CHANNEL_SYSTEM_PROMPT`) to wrap every part of
 * its reply in one of two delimiters: conversational remarks in
 * `[CHAT]...[/CHAT]`, generated fiction in `[TEXTE]...[/TEXTE]`. This module
 * splits a raw reply (or a partial, still-streaming prefix of one) back into
 * its two channels.
 *
 * `parseChanneledContent` is a pure function of the *whole* accumulated
 * string so far — callers re-run it on the full buffer as it grows during
 * streaming rather than feeding it chunks incrementally. That sidesteps the
 * classic streaming-parser trap where a delimiter gets split across two
 * chunks: there is no parser state to corrupt, every call just re-derives
 * the answer from scratch.
 *
 * Any text outside of a recognized tag (before the first tag, between two
 * tags, or the entire reply if the model forgets to use tags) is treated as
 * chat content — the safer fallback, since it keeps stray text visible
 * instead of silently dropping it into the fiction panel.
 */

type Channel = 'chat' | 'story'

type Tag = { channel: Channel; open: string; close: string }

const TAGS: readonly Tag[] = [
  { channel: 'chat', open: '[CHAT]', close: '[/CHAT]' },
  { channel: 'story', open: '[TEXTE]', close: '[/TEXTE]' },
]

export type ChanneledContent = { chat: string; story: string }

/**
 * True when `raw` contains at least one recognized opening delimiter
 * ([CHAT] or [TEXTE]). Used server-side to detect and log replies where the
 * model omitted the delimiters entirely — see `app/api/chat/route.ts` — so
 * the frequency of that failure mode can be measured, since such a reply is
 * otherwise routed in full to the chat channel by the fallback below.
 */
export function hasRecognizedChannelTags(raw: string): boolean {
  return TAGS.some((tag) => raw.includes(tag.open))
}

/**
 * Returns the length of the longest suffix of `text` that could be the start
 * of one of `candidates` — e.g. `"foo["` against `["[/CHAT]"]` returns 1.
 * Used to hold back a possibly-partial delimiter split across chunks instead
 * of emitting its characters as plain content.
 */
function partialTagSuffixLength(text: string, candidates: readonly string[]): number {
  const maxLen = Math.min(text.length, Math.max(...candidates.map((tag) => tag.length)) - 1)
  for (let len = maxLen; len > 0; len--) {
    const suffix = text.slice(text.length - len)
    if (candidates.some((tag) => tag.startsWith(suffix))) return len
  }
  return 0
}

export function parseChanneledContent(raw: string): ChanneledContent {
  let chat = ''
  let story = ''
  let index = 0
  let currentChannel: Channel | null = null

  while (index < raw.length) {
    if (currentChannel === null) {
      let openIndex = -1
      let openTag: Tag | null = null
      for (const tag of TAGS) {
        const found = raw.indexOf(tag.open, index)
        if (found !== -1 && (openIndex === -1 || found < openIndex)) {
          openIndex = found
          openTag = tag
        }
      }

      if (openTag && openIndex !== -1) {
        chat += raw.slice(index, openIndex)
        currentChannel = openTag.channel
        index = openIndex + openTag.open.length
      } else {
        const remainder = raw.slice(index)
        const holdback = partialTagSuffixLength(
          remainder,
          TAGS.map((tag) => tag.open),
        )
        chat += remainder.slice(0, remainder.length - holdback)
        break
      }
    } else {
      const tag = TAGS.find((candidate) => candidate.channel === currentChannel)!
      const closeIndex = raw.indexOf(tag.close, index)
      const reopenIndex = raw.indexOf(tag.open, index)

      if (reopenIndex !== -1 && (closeIndex === -1 || reopenIndex < closeIndex)) {
        // The model repeated the same channel's opening tag before closing
        // the previous block (e.g. a new paragraph starting with [TEXTE]
        // again instead of continuing inside the still-open one). Treat the
        // repeated opening tag as a no-op: keep the content before it,
        // consume the tag itself without adding it to the content, and stay
        // in the same channel rather than letting the literal tag text leak
        // into the output.
        const content = raw.slice(index, reopenIndex)
        if (currentChannel === 'chat') chat += content
        else story += content
        index = reopenIndex + tag.open.length
        continue
      }

      if (closeIndex !== -1) {
        const content = raw.slice(index, closeIndex)
        if (currentChannel === 'chat') chat += content
        else story += content
        index = closeIndex + tag.close.length
        currentChannel = null
      } else {
        const remainder = raw.slice(index)
        const holdback = partialTagSuffixLength(remainder, [tag.close, tag.open])
        const safe = remainder.slice(0, remainder.length - holdback)
        if (currentChannel === 'chat') chat += safe
        else story += safe
        break
      }
    }
  }

  return { chat, story }
}
