import { NextResponse } from 'next/server'
import { createSession } from '@/lib/authRepository'
import { getOrigin } from '@/lib/webauthnConfig'
import { setSessionCookie } from '@/lib/sessionCookie'

/**
 * Dev-only shortcut for the login screen: skips the WebAuthn ceremony
 * entirely and mints a session directly. `proxy.ts` already bypasses the
 * auth gate in development, so this only matters when the login page is
 * reached directly (e.g. testing it on a device/emulator with no platform
 * authenticator, like Chrome DevTools' mobile device toolbar). Guarded by
 * `NODE_ENV` so it can never work once `next build`/`next start` run.
 */
export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const token = createSession()
  const secure = getOrigin(request).startsWith('https://')
  const response = NextResponse.json({ verified: true })
  setSessionCookie(response, token, secure)
  return response
}
