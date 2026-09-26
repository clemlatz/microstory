import { describe, it, expect } from 'vitest'
import { sortAlphabetically } from './sortAlphabetically'

describe('sortAlphabetically', () => {
  it('ignores case and accents', () => {
    const result = sortAlphabetically(['bob', 'Émile', 'alice', 'Zed'], (s) => s)
    expect(result).toEqual(['alice', 'bob', 'Émile', 'Zed'])
  })

  it('orders numbers naturally', () => {
    expect(sortAlphabetically(['Note 10', 'Note 2'], (s) => s)).toEqual(['Note 2', 'Note 10'])
  })

  it('does not mutate its input', () => {
    const input = ['b', 'a']
    sortAlphabetically(input, (s) => s)
    expect(input).toEqual(['b', 'a'])
  })
})
