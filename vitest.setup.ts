import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

/**
 * jsdom doesn't implement `window.matchMedia` at all — components that use
 * it (e.g. `StoryPageClient`'s desktop/mobile nav detection) would throw
 * under test otherwise. Defaults to "no match" (mobile-width viewport,
 * matching this suite's existing narrow-viewport expectations); a test that
 * needs desktop-width behavior overrides this per-test.
 */
window.matchMedia =
  window.matchMedia ??
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
