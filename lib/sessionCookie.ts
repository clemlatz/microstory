import { readCookie, serializeCookie } from './cookies'
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS } from './authRepository'

export function readSessionToken(request: Request): string | null {
  return readCookie(request, SESSION_COOKIE_NAME)
}

export function setSessionCookie(response: Response, token: string, secure: boolean): void {
  response.headers.append(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE_NAME, token, {
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
      secure,
    }),
  )
}

export function clearSessionCookie(response: Response, secure: boolean): void {
  response.headers.append(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE_NAME, '', { maxAge: 0, secure }),
  )
}
