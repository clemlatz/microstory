import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/authRepository'
import { readSessionToken, clearSessionCookie } from '@/lib/sessionCookie'
import { getOrigin } from '@/lib/webauthnConfig'

export async function POST(request: Request): Promise<Response> {
  const token = readSessionToken(request)
  deleteSession(token)

  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response, getOrigin(request).startsWith('https://'))
  return response
}
