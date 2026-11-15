import { describe, it, expect } from 'vitest'
import { foldText, findFoldedMatches } from './foldText'

describe('foldText', () => {
  it('lowercases and removes accents', () => {
    expect(foldText('Héléna À L’ÉCOLE')).toBe('helena a l’ecole')
  })
})

describe('findFoldedMatches', () => {
  it('finds accent- and case-insensitive matches as original ranges', () => {
    const text = 'Héléna et helena'
    expect(findFoldedMatches(text, 'HELENA').map(([a, b]) => text.slice(a, b))).toEqual(['Héléna', 'helena'])
  })

  it('includes decomposed combining marks in the matched range', () => {
    const text = 'Héléna' // "Héléna" typed as e + combining acute
    const [[start, end]] = findFoldedMatches(text, 'helena')
    expect([start, end]).toEqual([0, text.length])
  })

  it('returns nothing for an empty query', () => {
    expect(findFoldedMatches('abc', '')).toEqual([])
  })
})
