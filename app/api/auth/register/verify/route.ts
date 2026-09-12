import { NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { hasPasskey, savePasskeyCredential, createSession } from '@/lib/authRepository'
import { getRpId, getOrigin } from '@/lib/webauthnConfig'
import { readChallengeCookie, clearChallengeCookie } from '@/lib/webauthnChallengeCookie'
import { setSessionCookie } from '@/lib/sessionCookie'

export async function POST(request: Request): Promise<Response> {
  if (hasPasskey()) {
    return NextResponse.json({ error: 'a passkey is already registered' }, { status: 409 })
  }

  const expectedChallenge = readChallengeCookie(request)
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'no registration in progress' }, { status: 400 })
  }

  const body = (await request.json()) as RegistrationResponseJSON
  const rpID = getRpId(request)
  const origin = getOrigin(request)
  const secure = origin.startsWith('https://')

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    })
  } catch (error) {
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : 'registration verification failed' },
      { status: 400 },
    )
    clearChallengeCookie(response, secure)
    return response
  }

  if (!verification.verified) {
    const response = NextResponse.json({ error: 'registration could not be verified' }, { status: 400 })
    clearChallengeCookie(response, secure)
    return response
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo
  savePasskeyCredential({
    id: credential.id,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  })

  const token = createSession()
  const response = NextResponse.json({ verified: true })
  setSessionCookie(response, token, secure)
  clearChallengeCookie(response, secure)
  return response
}
