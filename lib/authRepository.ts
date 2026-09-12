import { randomBytes, randomUUID, createHash } from 'node:crypto'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { getDb } from './db'

/**
 * Passkey (WebAuthn) authentication — see issue #73. This is the app's only
 * access control now that encryption-at-rest (and the passphrase gate it
 * came with) has been removed: a single user registers exactly one passkey
 * on first launch, then must authenticate with it on every new session.
 * Nothing here is about encrypting stored content — it's purely a login gate.
 */

const WEBAUTHN_USER_ID_KEY = 'webauthnUserId'
const WEBAUTHN_CREDENTIAL_KEY = 'webauthnCredential'

export const SESSION_COOKIE_NAME = 'microstory_session'
/** ~400 days, the maximum `Max-Age` Chrome will actually honor — as close to
 * "no expiration" as a persistent cookie can get (see issue #73's clarification
 * that this should be a long-lived session, not one with a short timeout). */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60

type SettingRow = { value: string }

function getSetting(key: string): string {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | SettingRow
    | undefined
  return row?.value ?? ''
}

function setSetting(key: string, value: string): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = @value',
  ).run({ key, value })
}

/**
 * A stable, opaque WebAuthn user handle for the single account this app
 * ever has. Generated once and persisted — it must stay the same across the
 * registration and every later authentication ceremony.
 */
export function getWebauthnUserId(): string {
  const existing = getSetting(WEBAUTHN_USER_ID_KEY)
  if (existing) return existing
  const generated = randomUUID()
  setSetting(WEBAUTHN_USER_ID_KEY, generated)
  return generated
}

export type StoredPasskey = {
  id: string
  publicKey: string // base64url-encoded
  counter: number
  transports?: AuthenticatorTransportFuture[]
  deviceType: string
  backedUp: boolean
}

export function getPasskeyCredential(): StoredPasskey | null {
  const stored = getSetting(WEBAUTHN_CREDENTIAL_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as StoredPasskey
  } catch {
    return null
  }
}

export function hasPasskey(): boolean {
  return getPasskeyCredential() !== null
}

export function savePasskeyCredential(passkey: StoredPasskey): void {
  setSetting(WEBAUTHN_CREDENTIAL_KEY, JSON.stringify(passkey))
}

export function updatePasskeyCounter(counter: number): void {
  const current = getPasskeyCredential()
  if (!current) return
  savePasskeyCredential({ ...current, counter })
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Creates a new session and returns the raw token to set as a cookie. Only
 * its hash is persisted, so the token itself exists nowhere but the cookie. */
export function createSession(): string {
  const token = randomBytes(32).toString('base64url')
  const db = getDb()
  db.prepare('INSERT INTO auth_sessions (token_hash, created_at) VALUES (?, ?)').run(
    hashToken(token),
    Date.now(),
  )
  return token
}

export function isValidSession(token: string | undefined | null): boolean {
  if (!token) return false
  const db = getDb()
  const row = db.prepare('SELECT 1 FROM auth_sessions WHERE token_hash = ?').get(hashToken(token))
  return row !== undefined
}

export function deleteSession(token: string | undefined | null): void {
  if (!token) return
  const db = getDb()
  db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hashToken(token))
}
