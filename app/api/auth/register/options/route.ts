import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { isoUint8Array } from '@simplewebauthn/server/helpers'
import { hasPasskey, getWebauthnUserId } from '@/lib/authRepository'
import { getRpId, getOrigin, RP_NAME } from '@/lib/webauthnConfig'
import { setChallengeCookie } from '@/lib/webauthnChallengeCookie'

/**
 * Starts a passkey registration ceremony. Only reachable while no passkey
 * exists yet — this app deliberately supports exactly one passkey (see
 * issue #73's clarification), so a device that already has one registered
 * can't register a second.
 */
export async function POST(request: Request): Promise<Response> {
  if (hasPasskey()) {
    return NextResponse.json({ error: 'a passkey is already registered' }, { status: 409 })
  }

  const rpID = getRpId(request)
  const origin = getOrigin(request)

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: 'microstory',
    userID: isoUint8Array.fromUTF8String(getWebauthnUserId()),
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  })

  const response = NextResponse.json(options)
  setChallengeCookie(response, options.challenge, origin.startsWith('https://'))
  return response
}
