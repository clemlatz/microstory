import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('authRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_PATH', ':memory:')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('has no passkey registered initially', async () => {
    const { hasPasskey, getPasskeyCredential } = await import('./authRepository')
    expect(hasPasskey()).toBe(false)
    expect(getPasskeyCredential()).toBeNull()
  })

  it('persists a saved passkey credential', async () => {
    const { savePasskeyCredential, getPasskeyCredential, hasPasskey } = await import('./authRepository')

    savePasskeyCredential({
      id: 'cred-1',
      publicKey: 'cHVibGljS2V5',
      counter: 0,
      transports: ['internal'],
      deviceType: 'singleDevice',
      backedUp: false,
    })

    expect(hasPasskey()).toBe(true)
    expect(getPasskeyCredential()).toEqual({
      id: 'cred-1',
      publicKey: 'cHVibGljS2V5',
      counter: 0,
      transports: ['internal'],
      deviceType: 'singleDevice',
      backedUp: false,
    })
  })

  it('updates only the counter of an existing passkey', async () => {
    const { savePasskeyCredential, updatePasskeyCounter, getPasskeyCredential } = await import(
      './authRepository'
    )

    savePasskeyCredential({
      id: 'cred-1',
      publicKey: 'cHVibGljS2V5',
      counter: 0,
      deviceType: 'singleDevice',
      backedUp: false,
    })
    updatePasskeyCounter(5)

    expect(getPasskeyCredential()?.counter).toBe(5)
    expect(getPasskeyCredential()?.id).toBe('cred-1')
  })

  it('is a no-op to update the counter when no passkey exists', async () => {
    const { updatePasskeyCounter, getPasskeyCredential } = await import('./authRepository')
    updatePasskeyCounter(5)
    expect(getPasskeyCredential()).toBeNull()
  })

  it('generates and persists a stable webauthn user id', async () => {
    const { getWebauthnUserId } = await import('./authRepository')
    const first = getWebauthnUserId()
    const second = getWebauthnUserId()
    expect(first).toBe(second)
    expect(first.length).toBeGreaterThan(0)
  })

  it('creates a session whose token validates, and rejects unknown tokens', async () => {
    const { createSession, isValidSession } = await import('./authRepository')

    const token = createSession()
    expect(isValidSession(token)).toBe(true)
    expect(isValidSession('not-a-real-token')).toBe(false)
    expect(isValidSession(null)).toBe(false)
    expect(isValidSession(undefined)).toBe(false)
  })

  it('invalidates a session on logout', async () => {
    const { createSession, isValidSession, deleteSession } = await import('./authRepository')

    const token = createSession()
    expect(isValidSession(token)).toBe(true)

    deleteSession(token)
    expect(isValidSession(token)).toBe(false)
  })

  it('deleting an unknown session token does not throw', async () => {
    const { deleteSession } = await import('./authRepository')
    expect(() => deleteSession('bogus')).not.toThrow()
    expect(() => deleteSession(null)).not.toThrow()
  })
})
