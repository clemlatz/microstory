import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME, isValidSession } from '@/lib/authRepository'

/**
 * Passkey login gate (issue #73) — the app's only access control now that
 * encryption-at-rest (and the passphrase gate it came with) is gone. Runs
 * for every request except: static assets, the login page itself, and the
 * two things that must stay reachable without a browser WebAuthn ceremony —
 * `/api/auth/*` (how a session cookie is obtained in the first place) and
 * `/api/mcp` (Claude web's connector, which keeps its own bearer-token
 * check and can't do a WebAuthn flow at all).
 *
 * Proxy defaults to the Node.js runtime (Next.js 16), which is what makes
 * calling into `lib/authRepository.ts` (better-sqlite3, a native binding)
 * safe here — the Edge runtime this used to run under could not load it.
 */

const STATIC_ASSET_PATTERN = /\.(png|jpg|jpeg|svg|ico|webp|gif|css|js|map|woff2?|ttf)$/

export function isPublicPath(pathname: string): boolean {
  if (pathname === '/login') return true
  if (pathname.startsWith('/api/auth/')) return true
  if (pathname === '/api/mcp') return true
  if (STATIC_ASSET_PATTERN.test(pathname)) return true
  return false
}

export default function proxy(request: NextRequest): Response {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (isValidSession(token)) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
