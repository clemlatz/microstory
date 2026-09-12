import { NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { getPasskeyCredential, updatePasskeyCounter, createSession } from '@/lib/authRepository'
import { getRpId, getOrigin } from '@/lib/webauthnConfig'
import { readChallengeCookie, clearChallengeCookie } from '@/lib/webauthnChallengeCookie'
import { setSessionCookie } from '@/lib/sessionCookie'

export async function POST(request: Request): Promise<Response> {
  const passkey = getPasskeyCredential()
  if (!passkey) {
    return NextResponse.json({ error: 'no passkey registered' }, { status: 404 })
  }

  const expectedChallenge = readChallengeCookie(request)
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'no authentication in progress' }, { status: 400 })
  }

  const body = (await request.json()) as AuthenticationResponseJSON
  const rpID = getRpId(request)
  const origin = getOrigin(request)
  const secure = origin.startsWith('https://')

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.id,
        publicKey: isoBase64URL.toBuffer(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports,
      },
    })
  } catch (error) {
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : 'authentication verification failed' },
      { status: 400 },
    )
    clearChallengeCookie(response, secure)
    return response
  }

  if (!verification.verified) {
    const response = NextResponse.json({ error: 'authentication could not be verified' }, { status: 400 })
    clearChallengeCookie(response, secure)
    return response
  }

  updatePasskeyCounter(verification.authenticationInfo.newCounter)

  const token = createSession()
  const response = NextResponse.json({ verified: true })
  setSessionCookie(response, token, secure)
  clearChallengeCookie(response, secure)
  return response
}
