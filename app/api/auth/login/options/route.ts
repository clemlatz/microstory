import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { getPasskeyCredential } from '@/lib/authRepository'
import { getRpId, getOrigin } from '@/lib/webauthnConfig'
import { setChallengeCookie } from '@/lib/webauthnChallengeCookie'

export async function POST(request: Request): Promise<Response> {
  const passkey = getPasskeyCredential()
  if (!passkey) {
    return NextResponse.json({ error: 'no passkey registered' }, { status: 404 })
  }

  const rpID = getRpId(request)
  const origin = getOrigin(request)

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [{ id: passkey.id, transports: passkey.transports }],
    userVerification: 'preferred',
  })

  const response = NextResponse.json(options)
  setChallengeCookie(response, options.challenge, origin.startsWith('https://'))
  return response
}
