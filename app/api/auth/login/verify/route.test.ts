import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/authRepository', () => ({
  getPasskeyCredential: vi.fn(),
  updatePasskeyCounter: vi.fn(),
  createSession: vi.fn(() => 'session-token'),
  SESSION_COOKIE_NAME: 'microstory_session',
  SESSION_COOKIE_MAX_AGE_SECONDS: 400 * 24 * 60 * 60,
}))

vi.mock('@simplewebauthn/server', () => ({
  verifyAuthenticationResponse: vi.fn(),
}))

vi.mock('@simplewebauthn/server/helpers', () => ({
  isoBase64URL: {
    toBuffer: vi.fn(() => new Uint8Array([1, 2, 3])),
  },
}))

import { POST } from './route'
import { getPasskeyCredential, updatePasskeyCounter, createSession } from '@/lib/authRepository'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'

const mockedGetPasskey = vi.mocked(getPasskeyCredential)
const mockedUpdateCounter = vi.mocked(updatePasskeyCounter)
const mockedCreateSession = vi.mocked(createSession)
const mockedVerify = vi.mocked(verifyAuthenticationResponse)

const storedPasskey = {
  id: 'cred-1',
  publicKey: 'pk',
  counter: 3,
  transports: ['internal'] as const,
  deviceType: 'singleDevice',
  backedUp: false,
}

function makeRequest(body: unknown = {}, cookie = 'microstory_webauthn_challenge=auth-challenge'): Request {
  return new Request('http://localhost/api/auth/login/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/login/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when no passkey is registered', async () => {
    mockedGetPasskey.mockReturnValue(null)
    const response = await POST(makeRequest())
    expect(response.status).toBe(404)
  })

  it('returns 400 when there is no challenge cookie', async () => {
    mockedGetPasskey.mockReturnValue(storedPasskey as never)
    const response = await POST(makeRequest({}, ''))
    expect(response.status).toBe(400)
    expect(mockedVerify).not.toHaveBeenCalled()
  })

  it('returns 400 and clears the challenge cookie when verification fails', async () => {
    mockedGetPasskey.mockReturnValue(storedPasskey as never)
    mockedVerify.mockResolvedValue({ verified: false } as never)

    const response = await POST(makeRequest())

    expect(response.status).toBe(400)
    expect(mockedUpdateCounter).not.toHaveBeenCalled()
    expect(response.headers.get('set-cookie')).toContain('microstory_webauthn_challenge=;')
  })

  it('updates the counter, creates a session, and clears the challenge cookie on success', async () => {
    mockedGetPasskey.mockReturnValue(storedPasskey as never)
    mockedVerify.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 4 },
    } as never)

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ verified: true })
    expect(mockedUpdateCounter).toHaveBeenCalledWith(4)
    expect(mockedCreateSession).toHaveBeenCalled()
    expect(response.headers.get('set-cookie')).toContain('microstory_session=session-token')
  })
})
