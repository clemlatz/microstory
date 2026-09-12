import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/authRepository', () => ({
  hasPasskey: vi.fn(),
  getWebauthnUserId: vi.fn(() => 'user-id-1'),
}))

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(async () => ({
    challenge: 'the-challenge',
    rp: { name: 'Microstory', id: 'localhost' },
  })),
}))

import { POST } from './route'
import { hasPasskey } from '@/lib/authRepository'
import { generateRegistrationOptions } from '@simplewebauthn/server'

const mockedHasPasskey = vi.mocked(hasPasskey)
const mockedGenerateRegistrationOptions = vi.mocked(generateRegistrationOptions)

function makeRequest(): Request {
  return new Request('http://localhost/api/auth/register/options', { method: 'POST' })
}

describe('POST /api/auth/register/options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 409 when a passkey is already registered', async () => {
    mockedHasPasskey.mockReturnValue(true)
    const response = await POST(makeRequest())
    expect(response.status).toBe(409)
    expect(mockedGenerateRegistrationOptions).not.toHaveBeenCalled()
  })

  it('returns registration options and sets a challenge cookie when unregistered', async () => {
    mockedHasPasskey.mockReturnValue(false)
    const response = await POST(makeRequest())
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.challenge).toBe('the-challenge')
    expect(response.headers.get('set-cookie')).toContain('microstory_webauthn_challenge=the-challenge')
  })
})
