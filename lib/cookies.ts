/**
 * Minimal cookie helpers. Route handlers here take a plain `Request` (not
 * `NextRequest`), so cookies are read straight from the `Cookie` header and
 * written as `Set-Cookie` response headers rather than via `next/headers`.
 */

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return null
}

export type CookieOptions = {
  maxAge?: number // seconds; omit for a session cookie, 0 to delete
  httpOnly?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  path?: string
  /** Only sent back over HTTPS. Left to the caller rather than inferred from
   * NODE_ENV — the app is reachable both via a Caddy-terminated HTTPS domain
   * and, per its own deployment doc, a plain-HTTP Tailscale address, and a
   * cookie marked Secure is silently dropped by the browser over HTTP. */
  secure?: boolean
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const { maxAge, httpOnly = true, sameSite = 'Lax', path = '/', secure = false } = options
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`]
  if (httpOnly) parts.push('HttpOnly')
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`)
  if (secure) parts.push('Secure')
  return parts.join('; ')
}
