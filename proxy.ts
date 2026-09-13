import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME, isValidSession } from '@/lib/authRepository'

/**
 * Passkey login gate (issue #73) — the app's only access control now that
 * encryption-at-rest (and the passphrase gate it came with) is gone. Runs
 * for every request except: static assets and the two things that must stay
 * reachable without a browser WebAuthn ceremony — `/api/auth/*` (how a
 * session cookie is obtained in the first place) and `/api/mcp` (Claude
 * web's connector, which keeps its own bearer-token check and can't do a
 * WebAuthn flow at all). `/login` itself is reachable without a session too,
 * but is special-cased above `isPublicPath`: with a valid session cookie it
 * redirects straight to `/` instead of showing the form again.
 *
 * Proxy defaults to the Node.js runtime (Next.js 16), which is what makes
 * calling into `lib/authRepository.ts` (better-sqlite3, a native binding)
 * safe here — the Edge runtime this used to run under could not load it.
 *
 * The whole gate is skipped when `NODE_ENV === 'development'` (set
 * automatically by `next dev`, including this project's dev server on
 * dev.ltzr.net) — going through a WebAuthn ceremony on every reload is
 * friction with no security benefit while iterating locally. `next build`
 * / `next start` (production) always set `NODE_ENV=production`, so this
 * can't accidentally ship to prod.
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

  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (pathname === '/login') {
    if (isValidSession(token)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

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
