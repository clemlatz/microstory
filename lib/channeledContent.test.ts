import { describe, it, expect } from 'vitest'
import { parseChanneledContent, hasRecognizedChannelTags } from './channeledContent'

describe('parseChanneledContent', () => {
  it('treats untagged text as chat (no tags at all)', () => {
    expect(parseChanneledContent('Bonjour, comment ça va ?')).toEqual({
      chat: 'Bonjour, comment ça va ?',
      story: '',
    })
  })

  it('extracts a single chat block', () => {
    expect(parseChanneledContent('[CHAT]Salut ![/CHAT]')).toEqual({ chat: 'Salut !', story: '' })
  })

  it('extracts a single story block', () => {
    expect(parseChanneledContent('[TEXTE]Il était une fois...[/TEXTE]')).toEqual({
      chat: '',
      story: 'Il était une fois...',
    })
  })

  it('routes chat and story blocks independently, in any order', () => {
    const raw = '[CHAT]Voici la suite ![/CHAT][TEXTE]Le vent soufflait.[/TEXTE]'
    expect(parseChanneledContent(raw)).toEqual({
      chat: 'Voici la suite !',
      story: 'Le vent soufflait.',
    })
  })

  it('concatenates multiple blocks of the same channel', () => {
    const raw = '[TEXTE]Chapitre un.[/TEXTE][CHAT]Note.[/CHAT][TEXTE] Chapitre deux.[/TEXTE]'
    expect(parseChanneledContent(raw)).toEqual({
      chat: 'Note.',
      story: 'Chapitre un. Chapitre deux.',
    })
  })

  it('treats text before the first tag as chat', () => {
    const raw = 'Introduction libre [TEXTE]Il pleuvait.[/TEXTE]'
    expect(parseChanneledContent(raw)).toEqual({
      chat: 'Introduction libre ',
      story: 'Il pleuvait.',
    })
  })

  it('treats text between two closed tags as chat', () => {
    const raw = '[TEXTE]Un.[/TEXTE] et voilà [TEXTE]Deux.[/TEXTE]'
    expect(parseChanneledContent(raw)).toEqual({
      chat: ' et voilà ',
      story: 'Un.Deux.',
    })
  })

  it('holds back a fully unclosed tag content until it is closed', () => {
    // an open story tag with no closing tag yet still contributes its
    // in-progress content to the story channel, since it is unambiguous
    // which channel it belongs to
    expect(parseChanneledContent('[TEXTE]Il était une fois')).toEqual({
      chat: '',
      story: 'Il était une fois',
    })
  })

  it('treats a repeated [TEXTE] opening tag before any closing tag as a no-op (issue #29)', () => {
    const raw = '[TEXTE]Paragraphe un.\n[TEXTE]Paragraphe deux.[/TEXTE]'
    expect(parseChanneledContent(raw)).toEqual({
      chat: '',
      story: 'Paragraphe un.\nParagraphe deux.',
    })
  })

  it('treats a repeated [CHAT] opening tag before any closing tag as a no-op (issue #29)', () => {
    const raw = '[CHAT]Remarque un.\n[CHAT]Remarque deux.[/CHAT]'
    expect(parseChanneledContent(raw)).toEqual({
      chat: 'Remarque un.\nRemarque deux.',
      story: '',
    })
  })

  it('handles more than two repeated opening tags in a row before the closing tag', () => {
    const raw = '[TEXTE]Un.\n[TEXTE]Deux.\n[TEXTE]Trois.[/TEXTE]'
    expect(parseChanneledContent(raw)).toEqual({
      chat: '',
      story: 'Un.\nDeux.\nTrois.',
    })
  })

  it('still holds back a still-streaming repeated opening tag prefix rather than emitting it as text', () => {
    expect(parseChanneledContent('[TEXTE]Un.\n[TEX')).toEqual({ chat: '', story: 'Un.\n' })
  })

  it('holds back a suffix that could be the start of an opening tag', () => {
    expect(parseChanneledContent('Bonjour [TEX')).toEqual({ chat: 'Bonjour ', story: '' })
    expect(parseChanneledContent('Bonjour [')).toEqual({ chat: 'Bonjour ', story: '' })
  })

  it('holds back a suffix that could be the start of a closing tag', () => {
    expect(parseChanneledContent('[TEXTE]Il était une fois[/TEX')).toEqual({
      chat: '',
      story: 'Il était une fois',
    })
  })

  it('produces the same final result whether fed all at once or as growing prefixes', () => {
    const full =
      '[CHAT]Voici un extrait ![/CHAT][TEXTE]Le vent soufflait sur la lande déserte.[/TEXTE][CHAT]Autre chose ?[/CHAT]'

    let lastResult = parseChanneledContent('')
    for (let end = 1; end <= full.length; end++) {
      lastResult = parseChanneledContent(full.slice(0, end))
    }

    expect(lastResult).toEqual(parseChanneledContent(full))
    expect(lastResult).toEqual({
      chat: 'Voici un extrait !Autre chose ?',
      story: 'Le vent soufflait sur la lande déserte.',
    })
  })

  it('returns empty strings for an empty input', () => {
    expect(parseChanneledContent('')).toEqual({ chat: '', story: '' })
  })
})

describe('hasRecognizedChannelTags', () => {
  it('returns false for text with no recognized tags', () => {
    expect(hasRecognizedChannelTags('Bonjour, comment ça va ?')).toBe(false)
    expect(hasRecognizedChannelTags('')).toBe(false)
  })

  it('returns true when a [CHAT] tag is present', () => {
    expect(hasRecognizedChannelTags('[CHAT]Salut ![/CHAT]')).toBe(true)
  })

  it('returns true when a [TEXTE] tag is present', () => {
    expect(hasRecognizedChannelTags('[TEXTE]Il était une fois...[/TEXTE]')).toBe(true)
  })

  it('returns true for a still-streaming prefix that only has an opening tag so far', () => {
    expect(hasRecognizedChannelTags('[TEXTE]Il était une fois')).toBe(true)
  })
})
