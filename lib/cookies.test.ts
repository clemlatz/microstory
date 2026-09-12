import { describe, it, expect } from 'vitest'
import { readCookie, serializeCookie } from './cookies'

describe('readCookie', () => {
  it('reads a cookie value from the Cookie header', () => {
    const request = new Request('http://localhost/', { headers: { cookie: 'a=1; b=2' } })
    expect(readCookie(request, 'b')).toBe('2')
  })

  it('returns null when the cookie is absent', () => {
    const request = new Request('http://localhost/', { headers: { cookie: 'a=1' } })
    expect(readCookie(request, 'missing')).toBeNull()
  })

  it('returns null when there is no Cookie header at all', () => {
    const request = new Request('http://localhost/')
    expect(readCookie(request, 'a')).toBeNull()
  })

  it('decodes URI-encoded values', () => {
    const request = new Request('http://localhost/', { headers: { cookie: 'a=hello%20world' } })
    expect(readCookie(request, 'a')).toBe('hello world')
  })
})

describe('serializeCookie', () => {
  it('includes HttpOnly, SameSite=Lax and Path=/ by default', () => {
    const value = serializeCookie('name', 'value')
    expect(value).toContain('name=value')
    expect(value).toContain('HttpOnly')
    expect(value).toContain('SameSite=Lax')
    expect(value).toContain('Path=/')
    expect(value).not.toContain('Secure')
  })

  it('adds Max-Age when provided', () => {
    expect(serializeCookie('name', 'value', { maxAge: 60 })).toContain('Max-Age=60')
  })

  it('adds Secure only when requested', () => {
    expect(serializeCookie('name', 'value', { secure: true })).toContain('Secure')
  })

  it('omits HttpOnly when disabled', () => {
    expect(serializeCookie('name', 'value', { httpOnly: false })).not.toContain('HttpOnly')
  })

  it('URI-encodes the value', () => {
    expect(serializeCookie('name', 'hello world')).toContain('name=hello%20world')
  })
})
