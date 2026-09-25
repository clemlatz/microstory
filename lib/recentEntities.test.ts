import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MAX_RECENT_ENTITIES, recordRecentEntity, useRecentEntities } from './recentEntities'

describe('recentEntities', () => {
  beforeEach(() => window.localStorage.clear())

  it('lists the most recently recorded entity first', () => {
    const { result } = renderHook(() => useRecentEntities('s1'))
    act(() => {
      recordRecentEntity('s1', { kind: 'note', id: 'a', title: 'A' })
      recordRecentEntity('s1', { kind: 'character', id: 'b', title: 'B' })
    })
    expect(result.current.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('moves a re-recorded entity to the top without duplicating it', () => {
    const { result } = renderHook(() => useRecentEntities('s1'))
    act(() => {
      recordRecentEntity('s1', { kind: 'note', id: 'a', title: 'A' })
      recordRecentEntity('s1', { kind: 'note', id: 'b', title: 'B' })
      recordRecentEntity('s1', { kind: 'note', id: 'a', title: 'A renamed' })
    })
    expect(result.current).toEqual([
      { kind: 'note', id: 'a', title: 'A renamed' },
      { kind: 'note', id: 'b', title: 'B' },
    ])
  })

  it('keeps at most 10 entries', () => {
    const { result } = renderHook(() => useRecentEntities('s1'))
    act(() => {
      for (let i = 0; i < 12; i++) recordRecentEntity('s1', { kind: 'note', id: `n${i}`, title: `N${i}` })
    })
    expect(result.current).toHaveLength(MAX_RECENT_ENTITIES)
    expect(result.current[0].id).toBe('n11')
  })

  it('scopes the history per story', () => {
    const { result } = renderHook(() => useRecentEntities('s2'))
    act(() => recordRecentEntity('s1', { kind: 'note', id: 'a', title: 'A' }))
    expect(result.current).toEqual([])
  })
})
