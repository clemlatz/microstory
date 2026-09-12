import { readCookie, serializeCookie } from './cookies'

/**
 * Holds the challenge for an in-progress registration/authentication
 * ceremony between the `options` and `verify` calls. A short-lived, httpOnly
 * cookie rather than a DB row: it's pure ephemeral ceremony state (gone the
 * moment the ceremony completes or expires), not anything worth persisting.
 */
const CHALLENGE_COOKIE_NAME = 'microstory_webauthn_challenge'
const CHALLENGE_MAX_AGE_SECONDS = 5 * 60

export function setChallengeCookie(response: Response, challenge: string, secure: boolean): void {
  response.headers.append(
    'Set-Cookie',
    serializeCookie(CHALLENGE_COOKIE_NAME, challenge, {
      maxAge: CHALLENGE_MAX_AGE_SECONDS,
      secure,
    }),
  )
}

export function readChallengeCookie(request: Request): string | null {
  return readCookie(request, CHALLENGE_COOKIE_NAME)
}

export function clearChallengeCookie(response: Response, secure: boolean): void {
  response.headers.append(
    'Set-Cookie',
    serializeCookie(CHALLENGE_COOKIE_NAME, '', { maxAge: 0, secure }),
  )
}
