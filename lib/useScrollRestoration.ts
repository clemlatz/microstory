"use client";

import { useEffect, type RefObject } from "react";

const STORAGE_PREFIX = "microstory_scroll_";

function readSavedScrollTop(key: string): number {
  try {
    const stored = sessionStorage.getItem(STORAGE_PREFIX + key);
    return stored ? Number(stored) : 0;
  } catch {
    return 0;
  }
}

function saveScrollTop(key: string, scrollTop: number) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, String(scrollTop));
  } catch {
    // Storage can throw (private browsing, blocked site data) — losing the
    // remembered position is harmless, so just skip persisting it.
  }
}

/**
 * Restores a scrollable element's scroll position on mount (or whenever
 * `key` changes) and keeps it saved to `sessionStorage` as the user
 * scrolls, so navigating away and back — a full route change, not just an
 * in-app state switch — lands back where the user left off instead of at
 * the top. Session-scoped rather than persisted, matching how a
 * browser's own scroll restoration behaves.
 *
 * The element is often still empty (a list fetching its data) when this
 * first runs, so setting `scrollTop` right away is clamped back to 0 by
 * the browser — there's nothing to scroll to yet. A `MutationObserver`
 * keeps reapplying the saved position as content is added, until it
 * actually sticks (or the user scrolls away from it themselves, which
 * simply saves the new position and stops any further reapplying).
 */
export function useScrollRestoration(
  ref: RefObject<HTMLElement | null>,
  key: string,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let target = readSavedScrollTop(key);
    element.scrollTop = target;

    const handleScroll = () => {
      target = element.scrollTop;
      saveScrollTop(key, target);
    };
    element.addEventListener("scroll", handleScroll, { passive: true });

    const observer = new MutationObserver(() => {
      if (element.scrollTop < target) element.scrollTop = target;
    });
    observer.observe(element, { childList: true, subtree: true });

    return () => {
      element.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [ref, key]);
}
