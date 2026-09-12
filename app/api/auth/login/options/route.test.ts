import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/authRepository', () => ({
  getPasskeyCredential: vi.fn(),
}))

vi.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: vi.fn(async () => ({ challenge: 'auth-challenge' })),
}))

import { POST } from './route'
import { getPasskeyCredential } from '@/lib/authRepository'
import { generateAuthenticationOptions } from '@simplewebauthn/server'

const mockedGetPasskey = vi.mocked(getPasskeyCredential)
const mockedGenerate = vi.mocked(generateAuthenticationOptions)

function makeRequest(): Request {
  return new Request('http://localhost/api/auth/login/options', { method: 'POST' })
}

describe('POST /api/auth/login/options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when no passkey is registered', async () => {
    mockedGetPasskey.mockReturnValue(null)
    const response = await POST(makeRequest())
    expect(response.status).toBe(404)
    expect(mockedGenerate).not.toHaveBeenCalled()
  })

  it('returns authentication options and sets a challenge cookie', async () => {
    mockedGetPasskey.mockReturnValue({
      id: 'cred-1',
      publicKey: 'pk',
      counter: 0,
      transports: ['internal'],
      deviceType: 'singleDevice',
      backedUp: false,
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ challenge: 'auth-challenge' })
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ allowCredentials: [{ id: 'cred-1', transports: ['internal'] }] }),
    )
    expect(response.headers.get('set-cookie')).toContain('microstory_webauthn_challenge=auth-challenge')
  })
})
