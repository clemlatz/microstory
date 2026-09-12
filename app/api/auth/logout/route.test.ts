import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/authRepository', () => ({
  deleteSession: vi.fn(),
  SESSION_COOKIE_NAME: 'microstory_session',
  SESSION_COOKIE_MAX_AGE_SECONDS: 400 * 24 * 60 * 60,
}))

import { POST } from './route'
import { deleteSession } from '@/lib/authRepository'

const mockedDeleteSession = vi.mocked(deleteSession)

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the session and clears the cookie', async () => {
    const request = new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { cookie: 'microstory_session=my-token' },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockedDeleteSession).toHaveBeenCalledWith('my-token')
    expect(response.headers.get('set-cookie')).toContain('microstory_session=;')
  })

  it('is a no-op when there is no session cookie', async () => {
    const request = new Request('http://localhost/api/auth/logout', { method: 'POST' })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockedDeleteSession).toHaveBeenCalledWith(null)
  })
})
