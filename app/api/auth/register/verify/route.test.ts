import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/authRepository', () => ({
  hasPasskey: vi.fn(),
  savePasskeyCredential: vi.fn(),
  createSession: vi.fn(() => 'session-token'),
  SESSION_COOKIE_NAME: 'microstory_session',
  SESSION_COOKIE_MAX_AGE_SECONDS: 400 * 24 * 60 * 60,
}))

vi.mock('@simplewebauthn/server', () => ({
  verifyRegistrationResponse: vi.fn(),
}))

vi.mock('@simplewebauthn/server/helpers', () => ({
  isoBase64URL: {
    fromBuffer: vi.fn(() => 'cHVibGljS2V5'),
  },
}))

import { POST } from './route'
import { hasPasskey, savePasskeyCredential, createSession } from '@/lib/authRepository'
import { verifyRegistrationResponse } from '@simplewebauthn/server'

const mockedHasPasskey = vi.mocked(hasPasskey)
const mockedSave = vi.mocked(savePasskeyCredential)
const mockedCreateSession = vi.mocked(createSession)
const mockedVerify = vi.mocked(verifyRegistrationResponse)

function makeRequest(body: unknown = {}, cookie = 'microstory_webauthn_challenge=the-challenge'): Request {
  return new Request('http://localhost/api/auth/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/register/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 409 when a passkey is already registered', async () => {
    mockedHasPasskey.mockReturnValue(true)
    const response = await POST(makeRequest())
    expect(response.status).toBe(409)
  })

  it('returns 400 when there is no challenge cookie', async () => {
    mockedHasPasskey.mockReturnValue(false)
    const response = await POST(makeRequest({}, ''))
    expect(response.status).toBe(400)
    expect(mockedVerify).not.toHaveBeenCalled()
  })

  it('returns 400 and clears the challenge cookie when verification fails', async () => {
    mockedHasPasskey.mockReturnValue(false)
    mockedVerify.mockResolvedValue({ verified: false } as never)

    const response = await POST(makeRequest())

    expect(response.status).toBe(400)
    expect(mockedSave).not.toHaveBeenCalled()
    expect(response.headers.get('set-cookie')).toContain('microstory_webauthn_challenge=;')
  })

  it('saves the credential, creates a session, and clears the challenge cookie on success', async () => {
    mockedHasPasskey.mockReturnValue(false)
    mockedVerify.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: { id: 'cred-1', publicKey: new Uint8Array([1, 2, 3]), counter: 0 },
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    } as never)

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ verified: true })
    expect(mockedSave).toHaveBeenCalledWith({
      id: 'cred-1',
      publicKey: 'cHVibGljS2V5',
      counter: 0,
      transports: undefined,
      deviceType: 'singleDevice',
      backedUp: false,
    })
    expect(mockedCreateSession).toHaveBeenCalled()
    const setCookies = response.headers.get('set-cookie') ?? ''
    expect(setCookies).toContain('microstory_session=session-token')
  })
})
