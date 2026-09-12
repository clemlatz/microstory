import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/authRepository', () => ({
  hasPasskey: vi.fn(),
}))

import { GET } from './route'
import { hasPasskey } from '@/lib/authRepository'

const mockedHasPasskey = vi.mocked(hasPasskey)

describe('GET /api/auth/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports hasPasskey true when a passkey is registered', async () => {
    mockedHasPasskey.mockReturnValue(true)
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ hasPasskey: true })
  })

  it('reports hasPasskey false otherwise', async () => {
    mockedHasPasskey.mockReturnValue(false)
    const response = await GET()
    expect(await response.json()).toEqual({ hasPasskey: false })
  })
})
