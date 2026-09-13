import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/authRepository', () => ({
  SESSION_COOKIE_NAME: 'microstory_session',
  isValidSession: vi.fn(),
}))

import proxy, { isPublicPath } from './proxy'
import { isValidSession } from '@/lib/authRepository'

const mockedIsValidSession = vi.mocked(isValidSession)

function makeRequest(pathname: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  })
}

describe('isPublicPath', () => {
  it('treats the login page as public', () => {
    expect(isPublicPath('/login')).toBe(true)
  })

  it('treats /api/auth/* as public', () => {
    expect(isPublicPath('/api/auth/status')).toBe(true)
    expect(isPublicPath('/api/auth/login/options')).toBe(true)
  })

  it('treats /api/mcp as public', () => {
    expect(isPublicPath('/api/mcp')).toBe(true)
  })

  it('treats static assets as public', () => {
    expect(isPublicPath('/logo-lotus.png')).toBe(true)
    expect(isPublicPath('/favicon.ico')).toBe(true)
  })

  it('treats app pages and other API routes as gated', () => {
    expect(isPublicPath('/')).toBe(false)
    expect(isPublicPath('/stories')).toBe(false)
    expect(isPublicPath('/story/abc')).toBe(false)
    expect(isPublicPath('/api/messages')).toBe(false)
  })
})

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lets public paths through without checking the session', () => {
    const response = proxy(makeRequest('/api/mcp'))
    expect(response.status).toBe(200)
    expect(mockedIsValidSession).not.toHaveBeenCalled()
  })

  it('shows the login page when there is no valid session', () => {
    mockedIsValidSession.mockReturnValue(false)
    const response = proxy(makeRequest('/login'))
    expect(response.status).toBe(200)
    expect(mockedIsValidSession).toHaveBeenCalledWith(undefined)
  })

  it('redirects /login to / when already authenticated', () => {
    mockedIsValidSession.mockReturnValue(true)
    const response = proxy(makeRequest('/login', 'microstory_session=good-token'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/')
    expect(mockedIsValidSession).toHaveBeenCalledWith('good-token')
  })

  it('lets a page request through with a valid session cookie', () => {
    mockedIsValidSession.mockReturnValue(true)
    const response = proxy(makeRequest('/stories', 'microstory_session=good-token'))
    expect(response.status).toBe(200)
    expect(mockedIsValidSession).toHaveBeenCalledWith('good-token')
  })

  it('redirects a page request with no valid session to /login', () => {
    mockedIsValidSession.mockReturnValue(false)
    const response = proxy(makeRequest('/story/abc'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/login')
  })

  it('returns 401 JSON for an unauthenticated API request', async () => {
    mockedIsValidSession.mockReturnValue(false)
    const response = proxy(makeRequest('/api/messages'))
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data).toEqual({ error: 'authentication required' })
  })

  it('bypasses the session check entirely when NODE_ENV is development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    mockedIsValidSession.mockReturnValue(false)

    const response = proxy(makeRequest('/story/abc'))

    expect(response.status).toBe(200)
    expect(mockedIsValidSession).not.toHaveBeenCalled()
  })

  it('still gates requests when NODE_ENV is production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    mockedIsValidSession.mockReturnValue(false)

    const response = proxy(makeRequest('/story/abc'))

    expect(response.status).toBe(307)
  })
})
