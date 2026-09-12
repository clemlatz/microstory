/**
 * Relying Party config for WebAuthn ceremonies. `rpID` must be the app's
 * registrable domain (no scheme/port) and `origin` must match exactly what
 * the browser reports (scheme + host + port) — both dev (localhost) and prod
 * (microstory.ink, behind Caddy) need this to resolve correctly,
 * so it's derived from the incoming request by default rather than
 * hardcoded, with env vars as an explicit override for when a proxy hides
 * the real host (same pattern as the other env vars in this repo).
 */

export const RP_NAME = 'Microstory'

export function getRpId(request: Request): string {
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host
  return host.split(':')[0]
}

export function getOrigin(request: Request): string {
  if (process.env.WEBAUTHN_ORIGIN) return process.env.WEBAUTHN_ORIGIN
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host
  const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '')
  return `${proto}://${host}`
}
