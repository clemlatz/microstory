import { NextResponse } from 'next/server'
import { hasPasskey } from '@/lib/authRepository'

/**
 * Tells the login page whether a passkey has ever been registered — if not,
 * it shows the first-time "register a passkey" flow instead of "log in".
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({ hasPasskey: hasPasskey() })
}
